import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    required: [true, 'Notification title is required']
  },
  body: {
    type: String,
    required: [true, 'Notification body is required']
  },
  type: {
    type: String,
    enum: [
      'order',
      'chat',
      'payment',
      'system',
      'promotion',
      'review'
    ],
    default: 'system'
  },
  data: {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat'
    },
    url: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  delivered: {
    type: Boolean,
    default: false
  },
  scheduledFor: Date,
  expireAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Expire after 30 days
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for TTL (time to live)
NotificationSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

// Create compound index for finding unread notifications efficiently
NotificationSchema.index({ recipient: 1, isRead: 1 });

// Ensure notifications are sorted by createdAt in descending order
NotificationSchema.pre(/^find/, function(next) {
  this.sort({ createdAt: -1 });
  next();
});

const Notification = mongoose.model('Notification', NotificationSchema);

export default Notification; 