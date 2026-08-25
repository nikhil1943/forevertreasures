from pydantic import BaseModel, EmailStr, Field, ConfigDict, AliasChoices
from typing import Optional, List


# --- Category Schemas ---
class CategoryBase(BaseModel):
    name: str
    slug: str

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# --- Product Schemas ---
class ProductBase(BaseModel):
    title: str
    description: Optional[str] = None
    price: float
    stock_quantity: int = 0
    # Accepts 'images' from Angular payloads OR 'image_urls' from SQLAlchemy models
    image_urls: List[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("images", "image_urls")
    )
    is_visible: bool = True
    category_id: int

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    category: CategoryResponse

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# --- Address Schemas ---
class AddressBase(BaseModel):
    label: str = "Primary"
    fullName: str = Field(..., validation_alias="full_name", serialization_alias="fullName")
    phone: str
    addressLine1: str = Field(..., validation_alias="address_line1", serialization_alias="addressLine1")
    addressLine2: Optional[str] = Field(None, validation_alias="address_line2", serialization_alias="addressLine2")
    city: str
    state: str
    zipCode: str = Field(..., validation_alias="zip_code", serialization_alias="zipCode")
    isDefault: bool = Field(False, validation_alias="is_default", serialization_alias="isDefault")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class AddressCreateRequest(AddressBase):
    pass

class AddressResponse(AddressBase):
    id: int


# --- Authentication & User Schemas ---
class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    fullName: str = Field(..., alias="full_name")
    phone: str
    address: Optional[AddressBase] = None

    model_config = ConfigDict(populate_by_name=True)

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserProfileResponse(BaseModel):
    id: int
    email: EmailStr
    fullName: str = Field(..., validation_alias="full_name", serialization_alias="fullName")
    phone: str
    role: str
    addresses: List[AddressResponse] = []

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class TokenResponse(BaseModel):
    token: str
    user: UserProfileResponse


# --- Checkout & Order Schemas ---
class OrderItemSchema(BaseModel):
    product_id: int
    quantity: int

class CheckoutRequest(BaseModel):
    customer_name: str
    email: EmailStr
    address_id: Optional[int] = None  # Saved address reference
    address: Optional[str] = None     # Manual inline address line
    city: Optional[str] = None        # Manual inline city
    items: List[OrderItemSchema]
    total_amount: float
    user_id: Optional[int] = None

class OrderResponse(BaseModel):
    id: int
    customer_name: str
    email: str
    total_amount: float
    user_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


# --- 2FA & Auth Verification Schemas ---
class Verify2FARequest(BaseModel):
    email: EmailStr
    code: str

class LoginResponse(BaseModel):
    requires2FA: bool = False
    access_token: str | None = None
    token_type: str | None = "bearer"
    message: str | None = None


# --- Payment Gateway Schemas ---
class CreatePaymentIntentRequest(BaseModel):
    amount: int  # Amount in smallest currency unit (e.g., cents or paise)
    currency: str = "usd"
    order_id: int

class PaymentIntentResponse(BaseModel):
    clientSecret: str


# --- Hero Media Schemas ---
class HeroMediaBase(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    media_url: str
    media_type: str = "IMAGE"
    cta_link: Optional[str] = None
    cta_text: Optional[str] = "Shop Now"
    display_order: int = 0
    is_active: bool = True

class HeroMediaCreate(HeroMediaBase):
    pass

class HeroMediaResponse(HeroMediaBase):
    id: int
    model_config = ConfigDict(from_attributes=True)