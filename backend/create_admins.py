import os
import sys
import getpass

# Add current directory to Python path for smooth module imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import User
from utils.security import hash_password


def create_admin_account(db, title: str):
    print(f"\n--- {title} Account Setup ---")
    email = input(f"Enter {title} Email: ").strip().lower()

    if not email:
        print("Error: Email cannot be empty. Skipping...")
        return None

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email).first()

    if existing_user:
        print(f"User '{email}' already exists. Updating role to 'admin'...")
        existing_user.role = "admin"
        return existing_user

    # Gather non-nullable fields required by your User model
    full_name = input(f"Enter {title} Full Name: ").strip() or f"{title} Admin"
    phone = input(f"Enter {title} Phone Number: ").strip() or "0000000000"

    password = getpass.getpass(f"Enter {title} Password: ")
    confirm_password = getpass.getpass(f"Confirm {title} Password: ")

    if password != confirm_password:
        print("Error: Passwords do not match. Skipping...")
        return None

    if len(password) < 8:
        print("Error: Password must be at least 8 characters long. Skipping...")
        return None

    hashed_pwd = hash_password(password)

    # Instantiate User with exact column names from models.py
    new_admin = User(
        email=email,
        password_hash=hashed_pwd,  # Matches models.py column
        full_name=full_name,       # Required (nullable=False)
        phone=phone,               # Required (nullable=False)
        role="admin"               # Set role to admin
    )
    
    db.add(new_admin)
    print(f"Staged admin account for: {email}")
    return new_admin


def main():
    print("==========================================")
    print("   Platform Admin One-Time Provisioning   ")
    print("==========================================")

    db = SessionLocal()
    try:
        create_admin_account(db, "Owner")
        create_admin_account(db, "Developer")
        db.commit()
        print("\nSuccessfully provisioned admin accounts in PostgreSQL!")
    except Exception as e:
        db.rollback()
        print(f"\nFailed to create admin accounts. Error: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()