import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import * as paymentService from '../services/paymentService.js';
import { sendNotification } from '../utils/sendNotification.js';

// @desc    Create payment order
// @route   POST /api/v1/payments/order
// @access  Private
export const createPaymentOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }
    
    // Check if order exists and belongs to user
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to process payment for this order'
      });
    }
    
    // Check if payment has already been made
    if (order.paymentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment has already been completed for this order'
      });
    }
    
    // Create payment order with payment gateway
    const paymentOrder = await paymentService.createPaymentOrder({
      orderId: order._id,
      amount: order.total
    });
    
    res.status(200).json({
      success: true,
      data: paymentOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify payment
// @route   POST /api/v1/payments/verify
// @access  Private
export const verifyPayment = async (req, res, next) => {
  try {
    const { paymentId, orderId, signature } = req.body;
    
    if (!paymentId || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID and Order ID are required'
      });
    }
    
    // Check if order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Verify the payment with payment gateway
    const { payment, order: updatedOrder } = await paymentService.verifyPayment({
      paymentId,
      orderId,
      signature
    });
    
    // Send notification to seller
    try {
      await sendNotification({
        recipientId: order.seller.toString(),
        title: 'Payment Received',
        body: `Payment for order #${order._id.toString().substr(-8)} has been received`,
        type: 'payment',
        data: {
          orderId: order._id.toString()
        }
      });
    } catch (err) {
      console.error('Notification error:', err);
      // Continue even if notification fails
    }
    
    res.status(200).json({
      success: true,
      data: {
        payment,
        order: updatedOrder
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process refund
// @route   POST /api/v1/payments/refund
// @access  Private (Admin only)
export const processRefund = async (req, res, next) => {
  try {
    const { paymentId, amount, reason } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }
    
    // Process the refund
    const { refund, payment, order } = await paymentService.processRefund({
      paymentId,
      amount,
      reason
    });
    
    // Send notification to customer
    try {
      await sendNotification({
        recipientId: order.customer.toString(),
        title: 'Refund Processed',
        body: `Your refund for order #${order._id.toString().substr(-8)} has been processed`,
        type: 'payment',
        data: {
          orderId: order._id.toString()
        }
      });
    } catch (err) {
      console.error('Notification error:', err);
      // Continue even if notification fails
    }
    
    res.status(200).json({
      success: true,
      data: {
        refund,
        payment,
        order
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process payout to seller
// @route   POST /api/v1/payments/payout
// @access  Private (Admin only)
export const processPayout = async (req, res, next) => {
  try {
    const { paymentId } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }
    
    // Process the payout
    const { payout, payment } = await paymentService.processPayout(paymentId);
    
    // Send notification to seller
    try {
      await sendNotification({
        recipientId: payment.seller.toString(),
        title: 'Payout Processed',
        body: `A payout of ₹${(payout.amount / 100).toFixed(2)} has been processed for your order`,
        type: 'payment',
        data: {
          payoutId: payout.id
        }
      });
    } catch (err) {
      console.error('Notification error:', err);
      // Continue even if notification fails
    }
    
    res.status(200).json({
      success: true,
      data: {
        payout,
        payment
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Payment webhook (for payment gateway callbacks)
// @route   POST /api/v1/payments/webhook
// @access  Public
export const webhookHandler = async (req, res, next) => {
  try {
    const event = req.body;
    
    // In a real implementation, you would validate the webhook signature
    // Example for Razorpay:
    /*
    const webhookSignature = req.headers['x-razorpay-signature'];
    const isValid = validateRazorpayWebhook(req.body, webhookSignature);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }
    */
    
    // Handle different event types
    // This is a simplified example. In production, you would handle various event types
    if (event.event === 'payment.captured' || event.event === 'payment.authorized') {
      // Process successful payment
      const paymentId = event.payload.payment.entity.id;
      const orderId = event.payload.payment.entity.notes?.order_id;
      
      if (orderId) {
        // Update order and payment status
        const order = await Order.findById(orderId);
        if (order) {
          order.paymentStatus = 'completed';
          if (order.status === 'pending') {
            order.status = 'confirmed';
          }
          await order.save();
          
          // Update payment record
          await Payment.findOneAndUpdate(
            { order: orderId },
            {
              status: 'completed',
              transactionId: paymentId,
              paymentGatewayResponse: event
            }
          );
          
          // Send notification to customer and seller
          try {
            await sendNotification({
              recipientId: order.customer.toString(),
              title: 'Payment Successful',
              body: 'Your payment has been successfully processed',
              type: 'payment',
              data: { orderId }
            });
            
            await sendNotification({
              recipientId: order.seller.toString(),
              title: 'Payment Received',
              body: `Payment received for order #${orderId.toString().substr(-8)}`,
              type: 'payment',
              data: { orderId }
            });
          } catch (err) {
            console.error('Notification error:', err);
          }
        }
      }
    } else if (event.event === 'payment.failed') {
      // Handle failed payment
      const orderId = event.payload.payment.entity.notes?.order_id;
      
      if (orderId) {
        const order = await Order.findById(orderId);
        if (order) {
          order.paymentStatus = 'failed';
          await order.save();
          
          // Update payment record
          await Payment.findOneAndUpdate(
            { order: orderId },
            {
              status: 'failed',
              paymentGatewayResponse: event
            }
          );
          
          // Send notification to customer
          try {
            await sendNotification({
              recipientId: order.customer.toString(),
              title: 'Payment Failed',
              body: 'Your payment has failed. Please try again.',
              type: 'payment',
              data: { orderId }
            });
          } catch (err) {
            console.error('Notification error:', err);
          }
        }
      }
    }
    
    // Acknowledge receipt of webhook
    res.status(200).json({
      success: true,
      message: 'Webhook received'
    });
  } catch (error) {
    console.error('Webhook error:', error);
    // Always return 200 to acknowledge webhook receipt
    res.status(200).json({
      success: false,
      message: 'Webhook processing error'
    });
  }
}; 