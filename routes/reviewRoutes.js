import express from 'express';
import { 
  getProductReviews, 
  getReview, 
  createReview, 
  updateReview, 
  deleteReview 
} from '../controllers/reviewController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router({ mergeParams: true });

// Get reviews for product
router.get('/', getProductReviews);
router.get('/:id', getReview);

// Protected routes
router.post('/', protect, createReview);
router.route('/:id')
  .put(protect, updateReview)
  .delete(protect, deleteReview);

export default router; 