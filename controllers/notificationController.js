import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendNotification, sendBulkNotifications } from '../utils/sendNotification.js';

// @desc    Get user notifications
// @route   GET /api/v1/notifications
// @access  Private
export const getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    
    const query = { recipient: req.user.id };
    
    // Filter by read status if provided
    if (req.query.isRead !== undefined) {
      query.isRead = req.query.isRead === 'true';
    }
    
    // Filter by type if provided
    if (req.query.type) {
      query.type = req.query.type;
    }
    
    const notifications = await Notification.find(query)
      .sort('-createdAt')
      .skip(startIndex)
      .limit(limit)
      .populate('sender', 'name image')
      .populate('data.orderId', 'status total')
      .populate('data.productId', 'name images');
    
    const total = await Notification.countDocuments(query);
    
    // Get unread count
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      isRead: false
    });
    
    // Pagination result
    const pagination = {
      total,
      pages: Math.ceil(total / limit),
      page,
      limit
    };
    
    res.status(200).json({
      success: true,
      count: notifications.length,
      pagination,
      unreadCount,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/v1/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    // Check if notification belongs to user
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this notification'
      });
    }
    
    // Mark as read
    notification.isRead = true;
    await notification.save();
    
    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/v1/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    // Check if notification belongs to user
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification'
      });
    }
    
    await notification.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete all notifications
// @route   DELETE /api/v1/notifications
// @access  Private
export const deleteAllNotifications = async (req, res, next) => {
  try {
    await Notification.deleteMany({ recipient: req.user.id });
    
    res.status(200).json({
      success: true,
      message: 'All notifications deleted'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send notification (Admin only)
// @route   POST /api/v1/notifications
// @access  Private (Admin)
export const sendNotificationHandler = async (req, res, next) => {
  try {
    const { recipientId, title, body, type, data, scheduledFor } = req.body;
    
    if (!recipientId || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID, title, and body are required'
      });
    }
    
    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }
    
    // Send notification
    const notification = await sendNotification({
      recipientId,
      senderId: req.user.id,
      title,
      body,
      type: type || 'system',
      data: data || {},
      scheduledFor
    });
    
    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send bulk notifications (Admin only)
// @route   POST /api/v1/notifications/bulk
// @access  Private (Admin)
export const sendBulkNotificationsHandler = async (req, res, next) => {
  try {
    const {
      recipientIds,
      userRole,
      title,
      body,
      type,
      data,
      scheduledFor
    } = req.body;
    
    if ((!recipientIds || !recipientIds.length) && !userRole) {
      return res.status(400).json({
        success: false,
        message: 'Either recipient IDs or user role is required'
      });
    }
    
    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Title and body are required'
      });
    }
    
    let recipients = [];
    
    // If recipientIds provided, use them
    if (recipientIds && recipientIds.length) {
      recipients = recipientIds;
    }
    // If userRole provided, find all users with that role
    else if (userRole) {
      const users = await User.find({ role: userRole }).select('_id');
      recipients = users.map(user => user._id.toString());
    }
    
    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No recipients found'
      });
    }
    
    // Send notifications
    const notifications = await sendBulkNotifications({
      recipientIds: recipients,
      senderId: req.user.id,
      title,
      body,
      type: type || 'system',
      data: data || {},
      scheduledFor
    });
    
    res.status(201).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
}; 