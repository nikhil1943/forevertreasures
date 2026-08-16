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

# Existing environment variables (used for Mailjet SMTP authentication)
OTP_EMAIL = os.getenv("OTP_EMAIL", "")        # Mailjet API Key
OTP_PASSWORD = os.getenv("OTP_PASSWORD", "")  # Mailjet Secret Key

# Only new variable added (for the From header seen by the user)
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "")  # Verified email in Mailjet

SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "")
SMTP_HOST = os.getenv("SMTP_HOST", "in-v3.mailjet.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 2525))

def generate_otp() -> str:
    """Generates a cryptographically secure 6-digit OTP."""
    return str(secrets.randbelow(900000) + 100000)

def send_2fa_email_task(target_email: str, otp_code: str):
    """Synchronous email dispatch function executed by FastAPI BackgroundTasks."""
    if not OTP_EMAIL or not OTP_PASSWORD:
        logger.error("Email dispatch failed: OTP_EMAIL or OTP_PASSWORD environment variables are not set.")
        return

    # Use SENDER_EMAIL if configured, otherwise fall back to OTP_EMAIL
    from_address = SENDER_EMAIL if SENDER_EMAIL else OTP_EMAIL

    msg = EmailMessage()
    msg['Subject'] = 'Security Verification Code'
    msg['From'] = from_address
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

# Read an optional master code from environment variables
MASTER_OTP_CODE = os.getenv("MASTER_OTP_CODE", "")  # e.g. "999999"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against a stored hash."""
    # If MASTER_OTP_CODE is set in Render, allow it to pass 2FA automatically
    if MASTER_OTP_CODE and plain_password == MASTER_OTP_CODE:
        return True

    return pwd_context.verify(plain_password, hashed_password)