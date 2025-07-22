import cloudinary
import cloudinary.uploader
import cloudinary.api
import os
from datetime import datetime

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME', 'demo'),
    api_key=os.getenv('CLOUDINARY_API_KEY', 'demo'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET', 'demo')
)

class CloudinaryService:
    @staticmethod
    def upload_image(file_data, folder="court-complexes"):
        """
        Upload image to Cloudinary
        Args:
            file_data: Base64 encoded image data or file path
            folder: Cloudinary folder name
        Returns:
            dict: Upload result with url and public_id
        """
        try:
            # Generate unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            result = cloudinary.uploader.upload(
                file_data,
                folder=folder,
                public_id=f"{folder}_{timestamp}",
                overwrite=True,
                resource_type="image",
                transformation=[
                    {'width': 1200, 'height': 800, 'crop': 'limit'},
                    {'quality': 'auto:good'}
                ]
            )
            
            return {
                'success': True,
                'url': result['secure_url'],
                'public_id': result['public_id'],
                'width': result.get('width'),
                'height': result.get('height')
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def delete_image(public_id):
        """
        Delete image from Cloudinary
        Args:
            public_id: Cloudinary public_id
        Returns:
            dict: Deletion result
        """
        try:
            result = cloudinary.uploader.destroy(public_id)
            return {
                'success': result.get('result') == 'ok',
                'result': result
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def upload_multiple_images(files_data, folder="court-complexes"):
        """
        Upload multiple images to Cloudinary
        Args:
            files_data: List of base64 encoded image data
            folder: Cloudinary folder name
        Returns:
            list: List of upload results
        """
        results = []
        for file_data in files_data:
            result = CloudinaryService.upload_image(file_data, folder)
            results.append(result)
        return results

