import express from 'express';
import { 
  createPaymentOrder, 
  verifyPayment, 
  processRefund, 
  processPayout, 
  webhookHandler 
} from '../controllers/paymentController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = express.Router();

// Public route for webhook
router.post('/webhook', webhookHandler);

// Protected routes
router.post('/order', protect, createPaymentOrder);
router.post('/verify', protect, verifyPayment);

// Admin only routes
router.post('/refund', protect, authorize('admin'), processRefund);
router.post('/payout', protect, authorize('admin'), processPayout);

export default router; 