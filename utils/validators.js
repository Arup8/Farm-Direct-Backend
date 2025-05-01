const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// User validators
const userValidators = {
  createUser: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 3, max: 50 }).withMessage('Name must be between 3 and 50 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Must be a valid email address'),
    body('password')
      .trim()
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone')
      .optional()
      .matches(/^(\+\d{1,3}[- ]?)?\d{10}$/).withMessage('Invalid phone number format'),
    body('role')
      .optional()
      .isIn(['customer', 'seller', 'admin']).withMessage('Invalid role')
  ],
  updateUser: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 }).withMessage('Name must be between 3 and 50 characters'),
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Must be a valid email address'),
    body('phone')
      .optional()
      .matches(/^(\+\d{1,3}[- ]?)?\d{10}$/).withMessage('Invalid phone number format')
  ],
  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Must be a valid email address'),
    body('password')
      .trim()
      .notEmpty().withMessage('Password is required')
  ]
};

// Product validators
const productValidators = {
  createProduct: [
    body('name')
      .trim()
      .notEmpty().withMessage('Product name is required')
      .isLength({ max: 100 }).withMessage('Product name cannot exceed 100 characters'),
    body('description')
      .trim()
      .notEmpty().withMessage('Product description is required')
      .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
    body('price')
      .notEmpty().withMessage('Price is required')
      .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('originalPrice')
      .optional()
      .isFloat({ min: 0 }).withMessage('Original price must be a positive number'),
    body('unit')
      .trim()
      .notEmpty().withMessage('Unit is required'),
    body('category')
      .trim()
      .notEmpty().withMessage('Category is required')
      .isIn(['vegetables', 'fruits', 'dairy', 'grains', 'meat', 'herbs', 'other'])
      .withMessage('Invalid category'),
    body('stock')
      .notEmpty().withMessage('Stock is required')
      .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer')
  ],
  updateProduct: [
    body('name')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Product name cannot exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
    body('price')
      .optional()
      .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('originalPrice')
      .optional()
      .isFloat({ min: 0 }).withMessage('Original price must be a positive number'),
    body('category')
      .optional()
      .trim()
      .isIn(['vegetables', 'fruits', 'dairy', 'grains', 'meat', 'herbs', 'other'])
      .withMessage('Invalid category'),
    body('stock')
      .optional()
      .isInt({ min: 0 }).withMessage('Stock must be a non-negative integer')
  ]
};

// Order validators
const orderValidators = {
  createOrder: [
    body('items')
      .isArray({ min: 1 }).withMessage('Order must contain at least one item'),
    body('items.*.product')
      .notEmpty().withMessage('Product ID is required for each item'),
    body('items.*.quantity')
      .notEmpty().withMessage('Quantity is required for each item')
      .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('address')
      .notEmpty().withMessage('Address is required'),
    body('paymentMethod')
      .notEmpty().withMessage('Payment method is required')
  ],
  updateOrderStatus: [
    body('status')
      .notEmpty().withMessage('Status is required')
      .isIn(['pending', 'confirmed', 'rejected', 'shipped', 'delivered', 'cancelled'])
      .withMessage('Invalid order status')
  ]
};

// Review validators
const reviewValidators = {
  createReview: [
    body('rating')
      .notEmpty().withMessage('Rating is required')
      .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment')
      .optional()
      .isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters')
  ]
};

// ID parameter validator
const idValidator = [
  param('id')
    .notEmpty().withMessage('ID parameter is required')
    .isMongoId().withMessage('Invalid ID format')
];

module.exports = {
  validate,
  userValidators,
  productValidators,
  orderValidators,
  reviewValidators,
  idValidator
}; 