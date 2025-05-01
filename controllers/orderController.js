import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import Payment from '../models/Payment.js';
import { sendNotification } from '../utils/sendNotification.js';
import * as paymentService from '../services/paymentService.js';

// @desc    Get all orders
// @route   GET /api/v1/orders
// @access  Private
export const getOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    let query = {};
    
    // If user is a customer, only show their orders
    if (req.user.role === 'customer') {
      query.customer = req.user.id;
    }
    
    // If user is a seller, only show orders for their products
    if (req.user.role === 'seller') {
      query.seller = req.user.id;
    }
    
    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    const orders = await Order.find(query)
      .sort('-createdAt')
      .skip(startIndex)
      .limit(limit)
      .populate('customer', 'name email')
      .populate('seller', 'name email')
      .populate('items.product');
    
    // Get total count for pagination
    const total = await Order.countDocuments(query);
    
    // Pagination result
    const pagination = {
      total,
      pages: Math.ceil(total / limit),
      page,
      limit
    };
    
    res.status(200).json({
      success: true,
      count: orders.length,
      pagination,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/v1/orders/:id
// @access  Private
export const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email')
      .populate('seller', 'name email')
      .populate('items.product');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if user is authorized to view this order
    if (
      req.user.role !== 'admin' &&
      order.customer.toString() !== req.user.id &&
      order.seller.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this order'
      });
    }
    
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create order
// @route   POST /api/v1/orders
// @access  Private
export const createOrder = async (req, res, next) => {
  try {
    const { items, address, paymentMethod } = req.body;
    
    // Validate request
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items in order'
      });
    }
    
    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Shipping address is required'
      });
    }
    
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required'
      });
    }
    
    // Group items by seller
    const itemsBySeller = {};
    
    // Verify all products and calculate totals
    let orderItems = [];
    
    for (const item of items) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for product: ${product.name}`
        });
      }
      
      // Group by seller
      const sellerId = product.createdBy.toString();
      if (!itemsBySeller[sellerId]) {
        itemsBySeller[sellerId] = [];
      }
      
      itemsBySeller[sellerId].push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        image: product.images.length > 0 ? product.images[0] : ''
      });
      
      // Update stock
      product.stock -= item.quantity;
      await product.save();
    }
    
    // Create orders for each seller
    const orders = [];
    
    for (const sellerId in itemsBySeller) {
      const sellerItems = itemsBySeller[sellerId];
      
      // Calculate total for this seller's items
      const total = sellerItems.reduce(
        (sum, item) => sum + (item.price * item.quantity),
        0
      );
      
      // Create the order
      const order = await Order.create({
        customer: req.user.id,
        seller: sellerId,
        items: sellerItems,
        status: 'pending',
        total,
        address,
        paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending'
      });
      
      // Create corresponding payment record
      const payment = await Payment.create({
        order: order._id,
        user: req.user.id,
        seller: sellerId,
        amount: total,
        paymentMethod,
        status: 'pending'
      });
      
      // If not COD, create payment order
      if (paymentMethod !== 'cod') {
        try {
          const paymentOrder = await paymentService.createPaymentOrder({
            orderId: order._id,
            amount: total
          });
          
          // Add payment info to response
          order._doc.paymentOrder = paymentOrder;
        } catch (err) {
          console.error('Payment gateway error:', err);
          // Continue even if payment gateway fails
        }
      }
      
      // Send notification to seller
      try {
        await sendNotification({
          recipientId: sellerId,
          title: 'New Order Received',
          body: `You have received a new order of ₹${total}`,
          type: 'order',
          data: {
            orderId: order._id.toString()
          }
        });
      } catch (err) {
        console.error('Notification error:', err);
        // Continue even if notification fails
      }
      
      orders.push(order);
    }
    
    // Clear the user's cart
    const cart = await Cart.findOne({ user: req.user.id });
    if (cart) {
      await cart.clearCart();
    }
    
    res.status(201).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/v1/orders/:id/status
// @access  Private (Seller, Admin)
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'rejected', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    // Get order
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check authorization
    if (
      req.user.role !== 'admin' &&
      order.seller.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this order'
      });
    }
    
    // Don't allow status changes for cancelled orders
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change status of cancelled order'
      });
    }
    
    // Special handling for cancelled/rejected status
    if (status === 'cancelled' || status === 'rejected') {
      // Restore product stock
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }
      
      // If payment was made, process refund
      if (order.paymentStatus === 'completed') {
        try {
          const payment = await Payment.findOne({ order: order._id });
          if (payment && payment.status === 'completed') {
            await paymentService.processRefund({
              paymentId: payment.transactionId,
              amount: order.total,
              reason: `Order ${status}`
            });
          }
        } catch (err) {
          console.error('Refund processing error:', err);
          // Continue even if refund fails
        }
      }
    }
    
    // Update order status
    order.status = status;
    await order.save();
    
    // Send notification to customer
    try {
      await sendNotification({
        recipientId: order.customer.toString(),
        title: 'Order Status Updated',
        body: `Your order status has been updated to: ${status}`,
        type: 'order',
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
      data: order
    });
  } catch (error) {
    next(error);
  }
}; 