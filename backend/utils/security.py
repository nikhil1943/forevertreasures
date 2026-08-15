import os
import secrets
import smtplib
import logging
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

# Configure logging to catch background task outputs in console/logs
logger = logging.getLogger("auth_security")
logging.basicConfig(level=logging.INFO)

OTP_EMAIL = os.getenv("OTP_EMAIL", "")
OTP_PASSWORD = os.getenv("OTP_PASSWORD", "")  # Use a Gmail App Password
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))

def generate_otp() -> str:
    """Generates a cryptographically secure 6-digit OTP."""
    return str(secrets.randbelow(900000) + 100000)

def send_2fa_email_task(target_email: str, otp_code: str):
    """Synchronous email dispatch function executed by FastAPI BackgroundTasks."""
    if not OTP_EMAIL or not OTP_PASSWORD:
        logger.error("Email dispatch failed: OTP_EMAIL or OTP_PASSWORD environment variables are not set.")
        return

    msg = EmailMessage()
    msg['Subject'] = 'Security Verification Code'
    msg['From'] = OTP_EMAIL
    msg['To'] = target_email
    
    msg.set_content(
        f"Your 6-digit verification code is: {otp_code}\n\n"
        f"This code expires in 10 minutes.\n\n"
        f"If you did not request this code, please contact support immediately.\n"
        f"Raise a ticket at: {SUPPORT_EMAIL}"
    )

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(OTP_EMAIL, OTP_PASSWORD)
            server.send_message(msg)
            logger.info(f"2FA OTP successfully sent to {target_email}")
    except Exception as e:
        logger.error(f"Failed to send 2FA email to {target_email}: {str(e)}", exc_info=True)
        
        
        
#password hashing helper functions for one time admin creation script
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hashes a plain text password using bcrypt."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against a stored hash."""
    return pwd_context.verify(plain_password, hashed_password)