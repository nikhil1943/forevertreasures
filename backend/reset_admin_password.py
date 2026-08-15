import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import User
from utils.security import hash_password

DEV_EMAIL = input("Enter your Dev Admin Email: ").strip().lower()
NEW_PASSWORD = input("Enter New Password: ")

db = SessionLocal()
user = db.query(User).filter(User.email == DEV_EMAIL).first()

if user:
    user.password_hash = hash_password(NEW_PASSWORD)
    db.commit()
    print(f"Password for {DEV_EMAIL} updated successfully!")
else:
    print(f"No user found with email {DEV_EMAIL}")

db.close()