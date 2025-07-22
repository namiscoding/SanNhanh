import requests
import json

class BankService:
    @staticmethod
    def get_banks():
        """
        Lấy danh sách ngân hàng từ VietQR API
        """
        try:
            # API VietQR để lấy danh sách ngân hàng
            response = requests.get('https://api.vietqr.io/v2/banks')
            
            if response.status_code == 200:
                data = response.json()
                if data.get('code') == '00':
                    banks = data.get('data', [])
                    # Format lại dữ liệu cho frontend
                    formatted_banks = []
                    for bank in banks:
                        formatted_banks.append({
                            'id': bank.get('id'),
                            'code': bank.get('code'),
                            'bin': bank.get('bin'),
                            'name': bank.get('name'),
                            'shortName': bank.get('shortName'),
                            'logo': bank.get('logo'),
                            'transferSupported': bank.get('transferSupported', 1),
                            'lookupSupported': bank.get('lookupSupported', 1)
                        })
                    return {
                        'success': True,
                        'banks': formatted_banks
                    }
            
            return {
                'success': False,
                'error': 'Không thể lấy danh sách ngân hàng'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Lỗi khi gọi API VietQR: {str(e)}'
            }
    
    @staticmethod
    def get_bank_by_code(bank_code):
        """
        Lấy thông tin ngân hàng theo mã
        """
        banks_result = BankService.get_banks()
        if banks_result['success']:
            for bank in banks_result['banks']:
                if bank['code'] == bank_code or bank['bin'] == bank_code:
                    return bank
        return None

