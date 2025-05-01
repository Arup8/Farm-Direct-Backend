import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { sendNotification } from '../utils/sendNotification.js';

// @desc    Get reviews for a product
// @route   GET /api/v1/products/:productId/reviews
// @access  Public
export const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Get reviews with pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const reviews = await Review.find({ product: productId })
      .sort('-createdAt')
      .skip(startIndex)
      .limit(limit);
    
    const total = await Review.countDocuments({ product: productId });
    
    // Pagination result
    const pagination = {
      total,
      pages: Math.ceil(total / limit),
      page,
      limit
    };
    
    res.status(200).json({
      success: true,
      count: reviews.length,
      pagination,
      data: reviews
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single review
// @route   GET /api/v1/reviews/:id
// @access  Public
export const getReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create review
// @route   POST /api/v1/products/:productId/reviews
// @access  Private
export const createReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { rating, comment, orderId } = req.body;
    
    if (!rating) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a rating'
      });
    }
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if order exists and contains this product
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Verify that the order belongs to the user
    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to review this order'
      });
    }
    
    // Verify that the product is in the order
    const productInOrder = order.items.some(
      item => item.product.toString() === productId
    );
    
    if (!productInOrder) {
      return res.status(400).json({
        success: false,
        message: 'You can only review products you have purchased'
      });
    }
    
    // Check if user has already reviewed this product for this order
    const existingReview = await Review.findOne({
      user: req.user.id,
      product: productId,
      order: orderId
    });
    
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product for this order'
      });
    }
    
    // Create review
    const review = await Review.create({
      user: req.user.id,
      product: productId,
      order: orderId,
      rating,
      comment
    });
    
    // Send notification to seller
    try {
      await sendNotification({
        recipientId: product.createdBy.toString(),
        title: 'New Product Review',
        body: `Your product "${product.name}" received a ${rating}-star review`,
        type: 'review',
        data: {
          productId: product._id.toString(),
          reviewId: review._id.toString()
        }
      });
    } catch (err) {
      console.error('Notification error:', err);
      // Continue even if notification fails
    }
    
    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update review
// @route   PUT /api/v1/reviews/:id
// @access  Private
export const updateReview = async (req, res, next) => {
  try {
    let review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    // Check review ownership
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this review'
      });
    }
    
    // Update fields
    const { rating, comment } = req.body;
    
    if (rating) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    
    await review.save();
    
    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete review
// @route   DELETE /api/v1/reviews/:id
// @access  Private
export const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }
    
    // Check review ownership
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this review'
      });
    }
    
    await review.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
}; 