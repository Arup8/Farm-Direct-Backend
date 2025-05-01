import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      name: String,
      quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1']
      },
      price: {
        type: Number,
        required: true
      },
      image: String
    }
  ],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total must be at least 0']
  },
  address: {
    name: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postal: String,
    country: String
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentId: String,
  deliveryTracking: {
    trackingId: String,
    provider: String,
    estimatedDelivery: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp on update
OrderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Populate items with product details
OrderSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'items.product',
    select: 'name images'
  });
  
  next();
});

const Order = mongoose.model('Order', OrderSchema);

export default Order; 