import express from 'express';
import { 
  getProducts, 
  getProduct, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  searchProducts 
} from '../controllers/productController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { uploadProductImages } from '../middlewares/uploadMiddleware.js';
import reviewRoutes from './reviewRoutes.js';

const router = express.Router();

// Product reviews - forwarded to reviewRoutes
router.use('/:productId/reviews', reviewRoutes);

// Public routes
router.get('/', getProducts);
router.get('/search', searchProducts);
router.get('/:id', getProduct);

// Protected routes - Seller and Admin only
router.post('/', protect, authorize('seller', 'admin'), uploadProductImages, createProduct);
router.put('/:id', protect, authorize('seller', 'admin'), uploadProductImages, updateProduct);
router.delete('/:id', protect, authorize('seller', 'admin'), deleteProduct);

export default router; 