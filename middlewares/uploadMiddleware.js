import multer from 'multer';

// Use memory storage instead of disk storage
// This will keep files in memory and not save them to disk
const storage = multer.memoryStorage();

// File filter - only accept images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

// Initialize multer upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  }
});

// Product image upload middleware
export const uploadProductImages = upload.array('images', 5); // Max 5 images per product

// Single image upload middleware
export const uploadSingleImage = upload.single('image'); 