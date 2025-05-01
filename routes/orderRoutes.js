import express from 'express';
import { 
  getOrders, 
  getOrder, 
  createOrder, 
  updateOrderStatus 
} from '../controllers/orderController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = express.Router();

// All order routes are protected
router.use(protect);

router.route('/')
  .get(getOrders)
  .post(createOrder);

router.route('/:id')
  .get(getOrder);

router.route('/:id/status')
  .put(authorize('seller', 'admin'), updateOrderStatus);

export default router; 