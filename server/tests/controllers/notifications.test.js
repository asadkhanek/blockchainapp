const mongoose = require('mongoose');
const supertest = require('supertest');
const app = require('../../app');
const User = require('../../models/user');
const Notification = require('../../models/notification');
const { generateJwtToken } = require('../../utils/auth');

const request = supertest(app);

describe('Notification Controller', () => {
  let token;
  let userId;

  beforeEach(async () => {
    // Create a test user
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!'
    });
    
    await user.save();
    userId = user._id;
    token = generateJwtToken(userId);
    
    // Create sample notifications
    await Notification.create([
      {
        recipient: userId,
        type: 'transaction',
        title: 'Transaction Confirmed',
        message: 'Your transaction of 0.5 BTC has been confirmed',
        isRead: false
      },
      {
        recipient: userId,
        type: 'security',
        title: 'New Login',
        message: 'New login detected from Windows device',
        isRead: false
      },
      {
        recipient: userId,
        type: 'wallet',
        title: 'Wallet Created',
        message: 'Your new wallet has been created successfully',
        isRead: true
      }
    ]);
  });

  describe('GET /api/notifications', () => {
    it('should return all user notifications when authenticated', async () => {
      const response = await request
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.notifications)).toBe(true);
      expect(response.body.notifications.length).toBe(3);
    });

    it('should return only unread notifications when requested', async () => {
      const response = await request
        .get('/api/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.notifications.length).toBe(2);
      expect(response.body.notifications.every(n => n.isRead === false)).toBe(true);
    });

    it('should filter notifications by type when requested', async () => {
      const response = await request
        .get('/api/notifications?type=transaction')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.notifications.length).toBe(1);
      expect(response.body.notifications[0].type).toBe('transaction');
    });
    
    it('should return 401 when not authenticated', async () => {
      const response = await request.get('/api/notifications');
      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      // Get unread notification
      const notificationsRes = await request
        .get('/api/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${token}`);
      
      const notificationId = notificationsRes.body.notifications[0]._id;
      
      const response = await request
        .put(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.notification.isRead).toBe(true);
      
      // Verify in database
      const updatedNotification = await Notification.findById(notificationId);
      expect(updatedNotification.isRead).toBe(true);
    });
  });

  describe('PUT /api/notifications/read-all', () => {
    it('should mark all user notifications as read', async () => {
      const response = await request
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.modifiedCount).toBeGreaterThan(0);
      
      // Verify all are marked read
      const notifications = await Notification.find({ recipient: userId });
      expect(notifications.every(n => n.isRead === true)).toBe(true);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete a specific notification', async () => {
      // Get notification to delete
      const notificationsRes = await request
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`);
      
      const notificationId = notificationsRes.body.notifications[0]._id;
      
      const response = await request
        .delete(`/api/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify deleted from database
      const deletedNotification = await Notification.findById(notificationId);
      expect(deletedNotification).toBeNull();
    });
  });

  describe('POST /api/notifications/subscribe', () => {
    it('should subscribe to push notifications', async () => {
      const subscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/123456789',
        keys: {
          p256dh: 'SAMPLE_P256DH_KEY',
          auth: 'SAMPLE_AUTH_KEY'
        }
      };

      const response = await request
        .post('/api/notifications/subscribe')
        .set('Authorization', `Bearer ${token}`)
        .send({ subscription });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
