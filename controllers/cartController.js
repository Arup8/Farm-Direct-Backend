import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

// @desc    Get user cart
// @route   GET /api/v1/cart
// @access  Private
export const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id });
    
    // If cart doesn't exist, create an empty one
    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: []
      });
    }
    
    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to cart
// @route   POST /api/v1/cart
// @access  Private
export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }
    
    // Validate product exists and has stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Not enough stock available'
      });
    }
    
    // Get cart or create if doesn't exist
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: []
      });
    }
    
    // Add product to cart
    await cart.addToCart(productId, quantity);
    
    // Get updated cart with populated items
    cart = await Cart.findOne({ user: req.user.id });
    
    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/v1/cart/:productId
// @access  Private
export const updateCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }
    
    // Validate product exists and has stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Not enough stock available'
      });
    }
    
    // Get cart
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    // Check if product is in cart
    const itemExists = cart.items.some(item => 
      item.product.toString() === productId
    );
    
    if (!itemExists) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in cart'
      });
    }
    
    // Update quantity
    await cart.updateQuantity(productId, quantity);
    
    // Get updated cart with populated items
    cart = await Cart.findOne({ user: req.user.id });
    
    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/v1/cart/:productId
// @access  Private
export const removeFromCart = async (req, res, next) => {
  try {
    const { productId } = req.params;
    
    // Get cart
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    // Check if product is in cart
    const itemExists = cart.items.some(item => 
      item.product.toString() === productId
    );
    
    if (!itemExists) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in cart'
      });
    }
    
    // Remove product
    await cart.removeFromCart(productId);
    
    // Get updated cart with populated items
    cart = await Cart.findOne({ user: req.user.id });
    
    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear cart
// @route   DELETE /api/v1/cart
// @access  Private
export const clearCart = async (req, res, next) => {
  try {
    // Get cart
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }
    
    // Clear cart
    await cart.clearCart();
    
    res.status(200).json({
      success: true,
      message: 'Cart cleared',
      data: { items: [] }
    });
  } catch (error) {
    next(error);
  }
}; 