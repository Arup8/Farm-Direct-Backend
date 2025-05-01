import mongoose from 'mongoose';

const ComplaintSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  targetProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  targetOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  type: {
    type: String,
    required: true,
    enum: [
      'bad-product',
      'late-delivery',
      'incorrect-order',
      'fraudulent-activity',
      'inappropriate-behavior',
      'other'
    ]
  },
  message: {
    type: String,
    required: [true, 'Please provide details about the complaint'],
    maxlength: [1000, 'Complaint message cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'in-review', 'resolved', 'rejected'],
    default: 'pending'
  },
  adminNotes: String,
  resolution: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt timestamp on save
ComplaintSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Populate references
ComplaintSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name image email'
  }).populate({
    path: 'targetUser',
    select: 'name image email'
  });
  
  next();
});

const Complaint = mongoose.model('Complaint', ComplaintSchema);

export default Complaint; 