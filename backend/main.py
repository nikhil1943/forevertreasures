import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Any

import jwt
import stripe
import razorpay
from fastapi import FastAPI, Depends, HTTPException, Query, status, APIRouter, Request, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel, EmailStr

import models
import schemas
from database import get_db, engine
from utils.security import (
    generate_otp, 
    send_2fa_email_task, 
    # send_reset_password_email_task
)

# Initialize database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ForeverTreasures API")

# --- Security & JWT Setup ---
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback_secret")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 15))
RESET_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_RESET_TOKEN_EXPIRE_MINUTES", 30))

# Password hashing context initialization
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

security = HTTPBearer()
security_optional = HTTPBearer(auto_error=False)

# --- External Payment SDKs Setup ---
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_YOUR_STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_YOUR_WEBHOOK_SECRET")

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_YOUR_KEY")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "YOUR_SECRET")
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Security & String Helper Functions ---
def generate_slug(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[\s_-]+', '-', text)

def hash_password(password: str) -> str:
    # Truncate to 72 bytes to prevent bcrypt ValueError
    return pwd_context.hash(password[:72])

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password[:72], hashed_password)

def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: int, db: Session) -> str:
    token_str = secrets.token_urlsafe(64)
    db_token = models.RefreshToken(user_id=user_id, token=token_str)
    db.add(db_token)
    db.commit()
    return token_str

def create_password_reset_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": email, "type": "reset", "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_password_reset_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "reset":
            return None
        return payload.get("sub")
    except jwt.PyJWTError:
        return None

def get_current_user_from_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> models.User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        user_id = int(user_id_str)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def require_admin_user(current_user: models.User = Depends(get_current_user_from_token)) -> models.User:
    if current_user.role.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access denied. Admin privileges required."
        )
    return current_user


# --- Request Schemas ---
class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class OrderStatusUpdatePayload(BaseModel):
    status: str

class RazorpayVerifyPayload(BaseModel):
    order_id: int
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


# --- Routers ---
auth_router = APIRouter(prefix="/api/auth", tags=["Auth"])
payment_router = APIRouter(prefix="/api/payments", tags=["Payments"])
admin_router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(require_admin_user)])
orders_router = APIRouter(prefix="/api/orders", tags=["Orders"])


# ==========================================
# AUTHENTICATION ENDPOINTS (/api/auth)
# ==========================================
@auth_router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserRegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_user = models.User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.fullName,
        phone=payload.phone,
        role="USER"
    )
    db.add(new_user)
    db.flush()

    if payload.address and payload.address.addressLine1:
        initial_address = models.Address(
            user_id=new_user.id,
            label=payload.address.label or "Primary",
            full_name=payload.fullName,
            phone=payload.phone,
            address_line1=payload.address.addressLine1,
            address_line2=payload.address.addressLine2,
            city=payload.address.city,
            state=payload.address.state,
            zip_code=payload.address.zipCode,
            is_default=True
        )
        db.add(initial_address)

    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(new_user.id)
    refresh_token = create_refresh_token(new_user.id, db)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": new_user
    }

@auth_router.post("/login")
def login(
    credentials: schemas.UserLoginRequest, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if user.role.lower() == "admin":
        otp_code = generate_otp()
        user.two_factor_code_hash = hash_password(otp_code)
        user.two_factor_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        db.commit()
        background_tasks.add_task(send_2fa_email_task, user.email, otp_code)
        return {"requires2FA": True, "message": "Security verification code sent to admin email."}

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id, db)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id, "email": user.email, "fullName": user.full_name,
            "phone": user.phone, "role": user.role, "addresses": []
        }
    }

MASTER_OTP_CODE = os.getenv("MASTER_OTP_CODE", "999999").strip().strip('"').strip("'")

@auth_router.post("/verify-2fa")
def verify_2fa(payload: schemas.Verify2FARequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found.")

    clean_code = str(payload.code).strip()

    # -------------------------------------------------------------
    # DIRECT MASTER OTP BYPASS (Bypasses DB hash & expiration checks)
    # -------------------------------------------------------------
    if MASTER_OTP_CODE and clean_code == MASTER_OTP_CODE:
        user.two_factor_code_hash = None
        user.two_factor_expires_at = None
        db.commit()

        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id, db)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user.id, "email": user.email, "fullName": user.full_name,
                "phone": user.phone, "role": user.role, "addresses": []
            }
        }

    # STANDARD 2FA CHECKS
    if user.role.lower() != "admin":
        raise HTTPException(status_code=400, detail="Invalid verification request.")
    if not user.two_factor_code_hash or not user.two_factor_expires_at:
        raise HTTPException(status_code=400, detail="No active 2FA request found.")
    
    expires_at = user.two_factor_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Verification code has expired. Please log in again.")

    if not verify_password(clean_code, user.two_factor_code_hash):
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    user.two_factor_code_hash = None
    user.two_factor_expires_at = None
    db.commit()

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id, db)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id, "email": user.email, "fullName": user.full_name,
            "phone": user.phone, "role": user.role, "addresses": []
        }
    }

@auth_router.post("/refresh")
def refresh_session(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    db_token = db.query(models.RefreshToken).filter(models.RefreshToken.token == payload.refresh_token).first()
    if not db_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or revoked refresh token")
    
    new_access_token = create_access_token(db_token.user_id)
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }

@auth_router.post("/logout")
def logout_session(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    db.query(models.RefreshToken).filter(models.RefreshToken.token == payload.refresh_token).delete()
    db.commit()
    return {"message": "Logged out successfully"}

@auth_router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if user:
        reset_token = create_password_reset_token(user.email)
        # background_tasks.add_task(send_reset_password_email_task, user.email, reset_token)

    return {"message": "If an account with that email exists, a password reset link has been sent."}

@auth_router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = verify_password_reset_token(payload.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.password_hash = hash_password(payload.new_password)
    db.query(models.RefreshToken).filter(models.RefreshToken.user_id == user.id).delete()
    db.commit()

    return {"message": "Password has been successfully reset. You can now log in with your new password."}


# ==========================================
# ADMIN PORTAL ENDPOINTS (/api/admin)
# ==========================================
@admin_router.get("/dashboard-stats")
def get_admin_dashboard_stats(db: Session = Depends(get_db)):
    total_orders = db.query(models.Order).count()
    total_users = db.query(models.User).count()
    total_products = db.query(models.Product).count()
    return {
        "totalOrders": total_orders,
        "totalUsers": total_users,
        "totalProducts": total_products
    }

# --- Admin Order Management ---

@admin_router.get("/orders")
def get_all_admin_orders(db: Session = Depends(get_db)):
    return db.query(models.Order).order_by(models.Order.id.desc()).all()

@admin_router.get("/orders/{order_id}")
def get_admin_order_by_id(order_id: int, db: Session = Depends(get_db)):
    """Fetch full order details including line items for the Admin panel."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order

@admin_router.patch("/orders/{order_id}/status")
def update_order_status(order_id: int, payload: OrderStatusUpdatePayload, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order

@admin_router.delete("/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_order(order_id: int, db: Session = Depends(get_db)):
    """Delete an order record permanently from the database."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    
    db.delete(order)
    db.commit()
    return None

# --- Admin Category Endpoints ---

@admin_router.get("/categories", response_model=List[schemas.CategoryResponse])
def get_admin_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()

@admin_router.post("/categories", response_model=schemas.CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(payload: schemas.CategoryCreate, db: Session = Depends(get_db)):
    existing_category = db.query(models.Category).filter(models.Category.name.ilike(payload.name)).first()
    if existing_category:
        raise HTTPException(status_code=400, detail="Category already exists")

    category_slug = payload.slug if payload.slug else generate_slug(payload.name)

    new_category = models.Category(
        name=payload.name,
        slug=category_slug
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return new_category

@admin_router.put("/categories/{category_id}", response_model=schemas.CategoryResponse)
def update_category(category_id: int, payload: schemas.CategoryCreate, db: Session = Depends(get_db)):
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    category.name = payload.name
    category.slug = payload.slug if payload.slug else generate_slug(payload.name)

    db.commit()
    db.refresh(category)
    return category

@admin_router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Session = Depends(get_db)):
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    db.delete(category)
    db.commit()
    return None

# --- Admin Product Endpoints ---

@admin_router.get("/products", response_model=List[schemas.ProductResponse])
def get_admin_products(db: Session = Depends(get_db)):
    """Fetch all products (including hidden ones) with eager category loading."""
    return db.query(models.Product).options(joinedload(models.Product.category)).all()


@admin_router.post("/products", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
def create_admin_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    product_data = payload.model_dump()
    
    new_product = models.Product(**product_data)
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    
    # Eagerly fetch category relationship so ProductResponse can serialize category
    return db.query(models.Product).options(joinedload(models.Product.category)).filter(models.Product.id == new_product.id).first()


@admin_router.put("/products/{product_id}", response_model=schemas.ProductResponse)
def update_admin_product(product_id: int, payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product_data = payload.model_dump(exclude_unset=True)
    for key, value in product_data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    
    # Return updated product with loaded category relationship
    return db.query(models.Product).options(joinedload(models.Product.category)).filter(models.Product.id == product.id).first()


@admin_router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Soft delete to avoid violating order_items foreign key constraints
    product.is_visible = False
    db.commit()
    return None

# ==========================================
# PUBLIC STOREFRONT ENDPOINTS (/api/...)
# ==========================================

# --- User Address Endpoints ---
@app.get("/api/user/addresses", response_model=List[schemas.AddressResponse])
def get_user_addresses(current_user: models.User = Depends(get_current_user_from_token), db: Session = Depends(get_db)):
    return db.query(models.Address).filter(models.Address.user_id == current_user.id).all()

@app.post("/api/user/addresses", response_model=List[schemas.AddressResponse], status_code=status.HTTP_201_CREATED)
def add_user_address(payload: schemas.AddressCreateRequest, current_user: models.User = Depends(get_current_user_from_token), db: Session = Depends(get_db)):
    if payload.isDefault:
        db.query(models.Address).filter(models.Address.user_id == current_user.id, models.Address.is_default == True).update({"is_default": False})

    new_address = models.Address(
        user_id=current_user.id, label=payload.label, full_name=payload.fullName, phone=payload.phone,
        address_line1=payload.addressLine1, address_line2=payload.addressLine2, city=payload.city,
        state=payload.state, zip_code=payload.zipCode, is_default=payload.isDefault
    )
    db.add(new_address)
    db.commit()
    return db.query(models.Address).filter(models.Address.user_id == current_user.id).all()

@app.delete("/api/user/addresses/{address_id}", response_model=List[schemas.AddressResponse])
def delete_user_address(address_id: int, current_user: models.User = Depends(get_current_user_from_token), db: Session = Depends(get_db)):
    address = db.query(models.Address).filter(models.Address.id == address_id, models.Address.user_id == current_user.id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    db.delete(address)
    db.commit()
    return db.query(models.Address).filter(models.Address.user_id == current_user.id).all()

# --- Public Store Catalog & Product Details ---
@app.get("/api/categories", response_model=List[schemas.CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()

@app.get("/api/products", response_model=List[schemas.ProductResponse])
def get_products(search: Optional[str] = Query(None), category_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """Public catalog endpoint for product list/search page."""
    query = db.query(models.Product).filter(models.Product.is_visible == True)
    if search:
        query = query.filter(models.Product.title.ilike(f"%{search}%"))
    if category_id:
        query = query.filter(models.Product.category_id == category_id)
    return query.all()

@app.get("/api/products/{product_id}", response_model=schemas.ProductResponse)
def get_product_by_id(product_id: int, db: Session = Depends(get_db)):
    """Public details page endpoint for a specific product."""
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.is_visible == True).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


# ==========================================
# STOREFRONT ORDER MANAGEMENT (/api/orders)
# ==========================================

@orders_router.post("", status_code=status.HTTP_201_CREATED)
def create_order(
    checkout_data: schemas.CheckoutRequest,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional)
):
    """Create a new checkout order with stock validation and Razorpay initialization."""
    if not checkout_data.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    final_address = checkout_data.address
    final_city = checkout_data.city
    user_id = checkout_data.user_id

    if credentials:
        try:
            payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = int(payload.get("sub"))
        except (jwt.PyJWTError, ValueError):
            pass

    if checkout_data.address_id:
        saved_address = db.query(models.Address).filter(models.Address.id == checkout_data.address_id).first()
        if not saved_address:
            raise HTTPException(status_code=404, detail="Selected saved address not found")
        if user_id and saved_address.user_id != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized address selection")

        line2 = f", {saved_address.address_line2}" if saved_address.address_line2 else ""
        final_address = f"{saved_address.address_line1}{line2}, {saved_address.state} {saved_address.zip_code}"
        final_city = saved_address.city
        user_id = saved_address.user_id

    if not final_address or not final_city:
        raise HTTPException(status_code=400, detail="Please select a saved address or provide a manual delivery address.")

    new_order = models.Order(
        user_id=user_id,
        customer_name=checkout_data.customer_name,
        email=checkout_data.email,
        address=final_address,
        city=final_city,
        total_amount=checkout_data.total_amount
    )
    db.add(new_order)
    db.flush()

    for item in checkout_data.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            db.rollback()
            raise HTTPException(status_code=404, detail=f"Product with ID {item.product_id} not found")
        if product.stock_quantity < item.quantity:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"Insufficient stock for '{product.title}'.")
        
        product.stock_quantity -= item.quantity
        order_item = models.OrderItem(
            order_id=new_order.id, product_id=product.id,
            quantity=item.quantity, price_at_purchase=product.price
        )
        db.add(order_item)

    amount_in_paisa = int(new_order.total_amount * 100)
    try:
        razorpay_order = razorpay_client.order.create({
            "amount": amount_in_paisa,
            "currency": "INR",
            "receipt": f"receipt_{new_order.id}",
            "notes": {"db_order_id": str(new_order.id)}
        })
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Razorpay Order Creation Failed: {str(e)}")

    db.commit()
    db.refresh(new_order)

    return {
        "id": new_order.id,
        "amount": amount_in_paisa,
        "currency": "INR",
        "razorpay_order_id": razorpay_order["id"],
        "razorpay_key_id": RAZORPAY_KEY_ID
    }

@orders_router.get("/my-orders")
def get_user_order_history(
    current_user: models.User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Retrieve all past and active orders for the logged-in user."""
    orders = (
        db.query(models.Order)
        .filter(models.Order.user_id == current_user.id)
        .order_by(models.Order.id.desc())
        .all()
    )
    return orders

@orders_router.get("/{order_id}")
def get_order_details(
    order_id: int,
    current_user: models.User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Retrieve detailed view for a specific order."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    
    if order.user_id != current_user.id and current_user.role.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="You do not have permission to view this order"
        )
    
    return order

@orders_router.post("/{order_id}/cancel")
def cancel_order(
    order_id: int,
    current_user: models.User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Allows a user to cancel an order before shipment.
    Restocks the reserved product quantities back into inventory stock.
    """
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    
    if order.user_id != current_user.id and current_user.role.lower() != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized action")
    
    cancellable_statuses = ["PENDING", "PROCESSING", "PAYMENT_PENDING"]
    if order.status.upper() not in cancellable_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel order with status '{order.status}'. Only pending or processing orders can be cancelled."
        )
    
    order.status = "CANCELLED"
    
    if hasattr(order, 'items') and order.items:
        for item in order.items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if product:
                product.stock_quantity += item.quantity
    
    db.commit()
    db.refresh(order)
    
    return {
        "message": f"Order #{order_id} successfully cancelled and stock returned to inventory.",
        "order": order
    }


# ==========================================
# PAYMENTS ROUTER (Stripe + Razorpay)
# ==========================================

@payment_router.post("/verify-razorpay")
def verify_razorpay_payment(payload: RazorpayVerifyPayload, db: Session = Depends(get_db)):
    """Verifies Razorpay payment signature and updates Order status to 'PAID'."""
    try:
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': payload.razorpay_order_id,
            'razorpay_payment_id': payload.razorpay_payment_id,
            'razorpay_signature': payload.razorpay_signature
        })
        
        order = db.query(models.Order).filter(models.Order.id == payload.order_id).first()
        if order:
            order.status = "PAID"
            if hasattr(order, 'razorpay_payment_id'):
                order.razorpay_payment_id = payload.razorpay_payment_id
            db.commit()
            
        return {
            "status": "success", 
            "message": "Payment verified successfully", 
            "order_id": payload.order_id
        }
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid payment signature. Transaction failed or compromised."
        )

@payment_router.post("/create-intent", response_model=schemas.PaymentIntentResponse)
def create_payment_intent(payload: schemas.CreatePaymentIntentRequest, db: Session = Depends(get_db)):
    try:
        intent = stripe.PaymentIntent.create(
            amount=payload.amount,
            currency=payload.currency.lower(),
            metadata={"order_id": str(payload.order_id)},
            automatic_payment_methods={"enabled": True},
        )
        return {"clientSecret": intent.client_secret}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=e.user_message or str(e))

@payment_router.post("/webhook", status_code=status.HTTP_200_OK)
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        order_id = payment_intent['metadata'].get('order_id')
        print(f"Payment succeeded for Order #{order_id}")

    return {"status": "success"}


# --- Register All APIRouters ---
app.include_router(auth_router)
app.include_router(payment_router)
app.include_router(admin_router)
app.include_router(orders_router)