import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required']
  },
  currency: {
    type: String,
    default: 'INR'
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['card', 'upi', 'wallet', 'cod', 'other']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentGateway: {
    type: String,
    enum: ['razorpay', 'stripe', 'other'],
    default: 'razorpay'
  },
  transactionId: String,
  paymentGatewayResponse: Object,
  refundId: String,
  refundReason: String,
  refundAmount: Number,
  refundedAt: Date,
  sellerPaidAt: Date,
  sellerPayoutId: String,
  platformFee: {
    type: Number,
    default: 0
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
PaymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Populate references
PaymentSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'order',
    select: 'items status total'
  }).populate({
    path: 'user',
    select: 'name email'
  }).populate({
    path: 'seller',
    select: 'name email'
  });
  
  next();
});

const Payment = mongoose.model('Payment', PaymentSchema);

export default Payment; 