const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const cloudName =
  process.env.CLOUDINARY_CLOUD_NAME ||
  process.env.CLOUD_NAME ||
  process.env.KEY_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY || process.env.API_KEY;
const apiSecret =
  process.env.CLOUDINARY_API_SECRET || process.env.SECRET_KEY;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'Wanderlust/listings',
    asset_folder: 'Wanderlust/listings',
    resource_type: 'image',
    allowed_formats: ['png', 'jpg', 'jpeg', 'webp', 'avif'],
    transformation: [
      {
        width: 1600,
        crop: 'limit',
        quality: 'auto',
        fetch_format: 'auto',
      },
    ],
  },
});

module.exports = {
  cloudinary,
  storage,
};
