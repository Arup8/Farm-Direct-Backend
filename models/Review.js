import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Please provide a rating'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  comment: {
    type: String,
    maxlength: [500, 'Comment cannot be more than 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent duplicate reviews (user can only review a product once per order)
ReviewSchema.index({ product: 1, user: 1, order: 1 }, { unique: true });

// Static method to calculate average rating and update product
ReviewSchema.statics.calcAverageRating = async function(productId) {
  const stats = await this.aggregate([
    {
      $match: { product: productId }
    },
    {
      $group: {
        _id: '$product',
        avgRating: { $avg: '$rating' },
        numReviews: { $sum: 1 }
      }
    }
  ]);
  
  if (stats.length > 0) {
    await mongoose.model('Product').findByIdAndUpdate(productId, {
      rating: stats[0].avgRating,
      reviews: stats[0].numReviews
    });
  } else {
    await mongoose.model('Product').findByIdAndUpdate(productId, {
      rating: 0,
      reviews: 0
    });
  }
};

// Call calcAverageRating after save
ReviewSchema.post('save', function() {
  this.constructor.calcAverageRating(this.product);
});

// Call calcAverageRating before remove
ReviewSchema.pre(/^findOneAnd/, async function(next) {
  this.r = await this.findOne();
  next();
});

ReviewSchema.post(/^findOneAnd/, async function() {
  if (this.r) {
    await this.r.constructor.calcAverageRating(this.r.product);
  }
});

// Populate user details
ReviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name image'
  });
  
  next();
});

const Review = mongoose.model('Review', ReviewSchema);

export default Review; 