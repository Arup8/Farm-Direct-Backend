import Notification from '../models/Notification.js';

/**
 * Send a notification to a user
 * @param {Object} notificationData - The notification data
 * @param {string} notificationData.recipientId - The user ID to send notification to
 * @param {string} notificationData.senderId - (Optional) The sender user ID
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.body - Notification body content
 * @param {string} notificationData.type - Notification type (order, chat, payment, system, promotion)
 * @param {Object} notificationData.data - Additional data for the notification
 * @param {Date} notificationData.scheduledFor - (Optional) When to send the notification
 * @returns {Promise<Object>} The created notification
 */
export const sendNotification = async (notificationData) => {
  try {
    const {
      recipientId,
      senderId,
      title,
      body,
      type = 'system',
      data = {},
      scheduledFor
    } = notificationData;
    
    if (!recipientId) {
      throw new Error('Recipient ID is required');
    }
    
    if (!title || !body) {
      throw new Error('Title and body are required');
    }
    
    // Make sure we have clean string IDs, not objects
    const recipientIdString = recipientId.toString();
    const senderIdString = senderId ? senderId.toString() : undefined;
    
    console.log('Sending notification to recipient:', recipientIdString);
    if (senderIdString) {
      console.log('From sender:', senderIdString);
    }
    
    try {
      // Create the notification in the database
      const notification = await Notification.create({
        recipient: recipientIdString,
        sender: senderIdString,
        title,
        body,
        type,
        data,
        scheduledFor,
        delivered: false, // Will be updated when push is sent
      });
      
      return notification;
    } catch (dbError) {
      console.error('Database error creating notification:', dbError);
      if (dbError.name === 'ValidationError' || dbError.name === 'CastError') {
        console.error('Validation error details:', {
          recipientId: recipientIdString,
          senderId: senderIdString,
          type
        });
      }
      throw dbError;
    }
    
    // For now we're just storing the notification in the database
    // In a production app, you would integrate with a push notification service
    // like Firebase Cloud Messaging (FCM) or Expo Push Notifications
    
    // Example integration code (commented):
    /*
    // If this is an immediate notification (not scheduled)
    if (!scheduledFor || scheduledFor <= new Date()) {
      // Get user's push token from User model
      const user = await User.findById(recipientId).select('pushToken');
      
      if (user && user.pushToken) {
        // Use a push service like Expo Push
        const message = {
          to: user.pushToken,
          sound: 'default',
          title: title,
          body: body,
          data: {
            ...data,
            notificationId: notification._id.toString()
          }
        };
        
        // Send the push notification
        const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });
        
        // Mark as delivered if successful
        if (pushResponse.ok) {
          notification.delivered = true;
          await notification.save();
        }
      }
    }
    */
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

/**
 * Send a notification to multiple users
 * @param {Object} notificationData - The notification data
 * @param {Array<string>} notificationData.recipientIds - Array of user IDs to send notification to
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.body - Notification body content
 * @param {string} notificationData.type - Notification type
 * @param {Object} notificationData.data - Additional data for the notification
 * @param {Date} notificationData.scheduledFor - (Optional) When to send the notification
 * @returns {Promise<Array<Object>>} Array of created notifications
 */
export const sendBulkNotifications = async (notificationData) => {
  const { recipientIds, ...restData } = notificationData;
  
  if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
    throw new Error('At least one recipient ID is required');
  }
  
  const notifications = [];
  
  for (const recipientId of recipientIds) {
    try {
      const notification = await sendNotification({
        recipientId,
        ...restData
      });
      
      notifications.push(notification);
    } catch (error) {
      console.error(`Failed to send notification to ${recipientId}:`, error);
      // Continue with other recipients even if one fails
    }
  }
  
  return notifications;
}; 