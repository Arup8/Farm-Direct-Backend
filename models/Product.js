import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a product name'],
    trim: true,
    maxlength: [100, 'Product name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a product description'],
    maxlength: [2000, 'Product description cannot be more than 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Please provide a product price'],
    min: [0, 'Price must be greater than 0']
  },
  originalPrice: {
    type: Number,
    min: [0, 'Original price must be greater than 0']
  },
  discountPercentage: {
    type: Number,
    min: [0, 'Discount percentage must be greater than or equal to 0'],
    max: [100, 'Discount percentage cannot be more than 100']
  },
  unit: {
    type: String,
    required: [true, 'Please provide a unit (e.g., kg, lb, piece)'],
    trim: true
  },
  images: [String],
  category: {
    type: String,
    required: [true, 'Please provide a product category'],
    enum: [
      'vegetables',
      'fruits',
      'dairy',
      'grains',
      'meat',
      'herbs',
      'other'
    ]
  },
  stock: {
    type: Number,
    required: [true, 'Please provide product stock quantity'],
    min: [0, 'Stock cannot be negative']
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating must be at least 0'],
    max: [5, 'Rating cannot be more than 5'],
    set: val => Math.round(val * 10) / 10 // Round to 1 decimal place
  },
  reviews: {
    type: Number,
    default: 0,
    min: [0, 'Number of reviews cannot be negative']
  },
  highlights: [String],
  packaging: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create text index for search
ProductSchema.index({
  name: 'text',
  description: 'text',
  category: 'text'
});

// Virtual for seller information
ProductSchema.virtual('seller', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true
});

// Update timestamp on save
ProductSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Product = mongoose.model('Product', ProductSchema);

export default Product; 