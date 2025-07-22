import requests
import json
from datetime import datetime

class VietQRService:
    def __init__(self):
        self.base_url = "https://img.vietqr.io/image"
    
    def generate_qr_code(self, bank_code, account_number, amount, description, account_name=None):
        """
        Generate VietQR code URL
        
        Args:
            bank_code (str): Bank code (e.g., "970415" for Vietinbank)
            account_number (str): Account number
            amount (float): Amount to transfer
            description (str): Transfer description
            account_name (str): Account holder name (optional)
        
        Returns:
            str: QR code image URL
        """
        try:
            # Format amount to integer (VND)
            amount_int = int(float(amount))
            
            # Clean description (remove special characters)
            clean_description = self._clean_description(description)
            
            # Build QR URL
            qr_url = f"{self.base_url}/{bank_code}-{account_number}-compact2.jpg"
            qr_url += f"?amount={amount_int}"
            qr_url += f"&addInfo={clean_description}"
            
            if account_name:
                clean_account_name = self._clean_description(account_name)
                qr_url += f"&accountName={clean_account_name}"
            
            return qr_url
            
        except Exception as e:
            print(f"Error generating VietQR: {str(e)}")
            return None
    
    def _clean_description(self, text):
        """Clean text for QR code description"""
        if not text:
            return ""
        
        # Remove special characters and limit length
        import re
        cleaned = re.sub(r'[^a-zA-Z0-9\s]', '', text)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        
        # Limit to 25 characters for QR compatibility
        return cleaned[:25]
    
    def generate_booking_qr(self, court_complex, booking_id, amount, customer_name):
        """
        Generate QR code for booking payment
        
        Args:
            court_complex: CourtComplex object with banking info
            booking_id: Booking ID
            amount: Payment amount
            customer_name: Customer name
        
        Returns:
            dict: QR info with URL and payment details
        """
        if not all([court_complex.bankCode, court_complex.accountNumber]):
            return None
        
        # Create payment description
        description = f"SportSync {booking_id} {customer_name}"
        
        qr_url = self.generate_qr_code(
            bank_code=court_complex.bankCode,
            account_number=court_complex.accountNumber,
            amount=amount,
            description=description,
            account_name=court_complex.accountName
        )
        
        if qr_url:
            return {
                "qr_url": qr_url,
                "bank_code": court_complex.bankCode,
                "account_number": court_complex.accountNumber,
                "account_name": court_complex.accountName,
                "amount": int(float(amount)),
                "description": description
            }
        
        return None

# Global instance
vietqr_service = VietQRService()

