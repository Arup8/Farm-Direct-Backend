import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
// console.log('Cloudinary Config - Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing');
// console.log('Cloudinary Config - API Key:', process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing');
// console.log('Cloudinary Config - API Secret:', process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Missing');

// Get values from environment or use these hardcoded ones as fallback
// IMPORTANT: Replace 'your_cloud_name', 'your_api_key', and 'your_api_secret' with your actual Cloudinary credentials
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'YOUR_ACTUAL_CLOUD_NAME_HERE';
const apiKey = process.env.CLOUDINARY_API_KEY || 'YOUR_ACTUAL_API_KEY_HERE';
const apiSecret = process.env.CLOUDINARY_API_SECRET || 'YOUR_ACTUAL_API_SECRET_HERE';

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret
});

// console.log('Cloudinary configured with cloud name:', cloudName);
// console.log('Cloudinary configured with cloud api key:', apiKey);
// console.log('Cloudinary configured with cloud api secret:', apiSecret);

export { cloudinary }; 