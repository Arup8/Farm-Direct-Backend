/**
 * Payment Service
 * 
 * This service handles integration with payment gateways (e.g., Razorpay, Stripe)
 * In a production app, you would integrate with actual payment providers
 */

import Payment from '../models/Payment.js';
import Order from '../models/Order.js';

/**
 * Create a payment order with the payment gateway
 * @param {Object} paymentData - The payment data
 * @returns {Object} Payment gateway order data
 */
export const createPaymentOrder = async (paymentData) => {
  try {
    const { orderId, amount, currency = 'INR' } = paymentData;
    
    if (!orderId || !amount) {
      throw new Error('Order ID and amount are required');
    }
    
    // In a real implementation, you would call the payment gateway API
    // Example with Razorpay:
    /*
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: currency,
      receipt: `order_${orderId}`,
      payment_capture: 1
    };
    
    const order = await instance.orders.create(options);
    return order;
    */
    
    // For demo purposes, we'll return a mock response
    return {
      id: `pay_${Date.now()}`,
      entity: 'order',
      amount: amount * 100,
      amount_paid: 0,
      amount_due: amount * 100,
      currency: currency,
      receipt: `order_${orderId}`,
      status: 'created',
      created_at: Date.now()
    };
  } catch (error) {
    console.error('Error creating payment order:', error);
    throw error;
  }
};

/**
 * Verify and process payment success
 * @param {Object} verificationData - The payment verification data
 * @returns {Object} Updated payment and order data
 */
export const verifyPayment = async (verificationData) => {
  try {
    const { paymentId, orderId, signature } = verificationData;
    
    if (!paymentId || !orderId) {
      throw new Error('Payment ID and Order ID are required');
    }
    
    // In a real implementation, you would verify the payment with the gateway
    // Example with Razorpay:
    /*
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(orderId + "|" + paymentId)
      .digest('hex');
      
    if (generated_signature !== signature) {
      throw new Error('Payment verification failed');
    }
    */
    
    // Get the order
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Update the payment
    const payment = await Payment.findOneAndUpdate(
      { order: orderId },
      {
        status: 'completed',
        transactionId: paymentId,
        paymentGatewayResponse: verificationData
      },
      { new: true }
    );
    
    // Update the order
    order.paymentStatus = 'completed';
    if (order.status === 'pending') {
      order.status = 'confirmed';
    }
    await order.save();
    
    return { payment, order };
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};

/**
 * Process refund
 * @param {Object} refundData - The refund data
 * @returns {Object} Refund response
 */
export const processRefund = async (refundData) => {
  try {
    const { paymentId, amount, reason } = refundData;
    
    if (!paymentId) {
      throw new Error('Payment ID is required');
    }
    
    // Find the payment
    const payment = await Payment.findOne({ transactionId: paymentId });
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    // In a real implementation, you would call the payment gateway's refund API
    // Example with Razorpay:
    /*
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    
    const refundOptions = {
      payment_id: paymentId,
      amount: amount * 100, // in paise
      notes: {
        reason: reason
      }
    };
    
    const refund = await instance.payments.refund(refundOptions);
    */
    
    // For demo, create a mock refund response
    const refundResponse = {
      id: `rfnd_${Date.now()}`,
      payment_id: paymentId,
      amount: amount * 100,
      currency: payment.currency,
      status: 'processed',
      created_at: Date.now()
    };
    
    // Update the payment with refund info
    payment.status = 'refunded';
    payment.refundId = refundResponse.id;
    payment.refundReason = reason;
    payment.refundAmount = amount;
    payment.refundedAt = new Date();
    await payment.save();
    
    // Update the associated order
    const order = await Order.findById(payment.order);
    if (order) {
      order.status = 'cancelled';
      order.paymentStatus = 'refunded';
      await order.save();
    }
    
    return { refund: refundResponse, payment, order };
  } catch (error) {
    console.error('Error processing refund:', error);
    throw error;
  }
};

/**
 * Process seller payout
 * @param {string} paymentId - The payment ID to process payout for
 * @returns {Object} Payout response
 */
export const processPayout = async (paymentId) => {
  try {
    // Find the payment
    const payment = await Payment.findOne({ transactionId: paymentId });
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    if (payment.status !== 'completed') {
      throw new Error('Cannot process payout for incomplete payment');
    }
    
    if (payment.sellerPaidAt) {
      throw new Error('Seller already paid for this payment');
    }
    
    // In a real app, you would integrate with a payout service
    // Example with Razorpay:
    /*
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    
    // Calculate platform fee
    const platformFee = payment.amount * 0.10; // 10% platform fee
    const payoutAmount = payment.amount - platformFee;
    
    // Get seller's Razorpay account ID
    const seller = await User.findById(payment.seller).select('razorpayAccountId');
    
    // Create payout
    const payout = await instance.payouts.create({
      account: seller.razorpayAccountId,
      amount: payoutAmount * 100, // in paise
      currency: "INR",
      notes: {
        orderId: payment.order.toString(),
        paymentId: payment.transactionId
      },
      purpose: "payout"
    });
    */
    
    // For demo, create a mock payout response
    const platformFee = payment.amount * 0.10; // 10% platform fee
    const payoutAmount = payment.amount - platformFee;
    
    const payoutResponse = {
      id: `pout_${Date.now()}`,
      amount: payoutAmount * 100,
      currency: payment.currency,
      fees: 0,
      status: 'processed',
      created_at: Date.now()
    };
    
    // Update payment with payout info
    payment.sellerPaidAt = new Date();
    payment.sellerPayoutId = payoutResponse.id;
    payment.sellerPayoutAmount = payoutAmount;
    payment.platformFee = platformFee;
    await payment.save();
    
    return { payout: payoutResponse, payment };
  } catch (error) {
    console.error('Error processing payout:', error);
    throw error;
  }
}; 