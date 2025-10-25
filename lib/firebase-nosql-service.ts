/**
 * Firebase NoSQL Service
 * 
 * This service demonstrates pure NoSQL usage with Firebase Realtime Database.
 * Unlike Supabase (SQL), Firebase stores data in JSON format without schemas.
 * 
 * Use cases for NoSQL (Firebase):
 * - Real-time activity feeds
 * - Chat messages
 * - User presence (online/offline status)
 * - Real-time notifications
 * - Event logs
 * - Temporary/cached data
 */

import { 
  ref, 
  push, 
  set, 
  get,
  onValue, 
  off, 
  update,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
  remove
} from 'firebase/database';
import { database } from './firebase';

// =====================================================
// ACTIVITY FEED - Real-time Updates (NoSQL Only)
// =====================================================

export interface ActivityFeedItem {
  id?: string;
  type: 'donation_created' | 'requirement_created' | 'match_created' | 'donation_completed' | 'user_registered';
  message: string;
  timestamp: string | object;
  userId?: string;
  metadata?: Record<string, any>;
}

export const activityFeedService = {
  // Create activity
  async create(activity: Omit<ActivityFeedItem, 'id' | 'timestamp'>): Promise<string> {
    try {
      const feedRef = ref(database, 'activity_feed');
      const newActivityRef = push(feedRef);
      
      const activityData: ActivityFeedItem = {
        ...activity,
        id: newActivityRef.key!,
        timestamp: serverTimestamp(),
      };
      
      await set(newActivityRef, activityData);
      console.log('✅ Activity created in Firebase (NoSQL):', newActivityRef.key);
      return newActivityRef.key!;
    } catch (error) {
      console.error('❌ Error creating activity in Firebase:', error);
      throw error;
    }
  },

  // Listen to real-time activity feed
  listenToFeed(
    limit: number,
    callback: (activities: ActivityFeedItem[]) => void
  ): () => void {
    const feedRef = query(
      ref(database, 'activity_feed'),
      orderByChild('timestamp'),
      limitToLast(limit)
    );
    
    const listener = onValue(feedRef, (snapshot) => {
      const activities: ActivityFeedItem[] = [];
      snapshot.forEach((child) => {
        activities.push(child.val());
      });
      
      // Reverse to show newest first
      activities.reverse();
      callback(activities);
    });

    return () => off(feedRef, 'value', listener);
  },

  // Get recent activities (one-time read)
  async getRecent(limit: number = 20): Promise<ActivityFeedItem[]> {
    try {
      const feedRef = query(
        ref(database, 'activity_feed'),
        orderByChild('timestamp'),
        limitToLast(limit)
      );
      
      const snapshot = await get(feedRef);
      const activities: ActivityFeedItem[] = [];
      
      snapshot.forEach((child) => {
        activities.push(child.val());
      });
      
      return activities.reverse();
    } catch (error) {
      console.error('❌ Error getting activities:', error);
      return [];
    }
  }
};

// =====================================================
// USER PRESENCE - Online/Offline Status (NoSQL Only)
// =====================================================

export interface UserPresence {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: string | object;
  currentPage?: string;
}

export const userPresenceService = {
  // Set user online
  async setOnline(userId: string, currentPage?: string): Promise<void> {
    try {
      const presenceRef = ref(database, `presence/${userId}`);
      await set(presenceRef, {
        userId,
        status: 'online',
        lastSeen: serverTimestamp(),
        currentPage: currentPage || 'unknown'
      });
      console.log('✅ User presence set to online:', userId);
    } catch (error) {
      console.error('❌ Error setting presence:', error);
    }
  },

  // Set user offline
  async setOffline(userId: string): Promise<void> {
    try {
      const presenceRef = ref(database, `presence/${userId}`);
      await update(presenceRef, {
        status: 'offline',
        lastSeen: serverTimestamp()
      });
      console.log('✅ User presence set to offline:', userId);
    } catch (error) {
      console.error('❌ Error setting presence:', error);
    }
  },

  // Listen to user presence
  listenToPresence(
    callback: (users: UserPresence[]) => void
  ): () => void {
    const presenceRef = ref(database, 'presence');
    
    const listener = onValue(presenceRef, (snapshot) => {
      const users: UserPresence[] = [];
      snapshot.forEach((child) => {
        users.push(child.val());
      });
      callback(users);
    });

    return () => off(presenceRef, 'value', listener);
  },

  // Get online users count
  async getOnlineCount(): Promise<number> {
    try {
      const presenceRef = ref(database, 'presence');
      const snapshot = await get(presenceRef);
      
      let count = 0;
      snapshot.forEach((child) => {
        const presence = child.val() as UserPresence;
        if (presence.status === 'online') {
          count++;
        }
      });
      
      return count;
    } catch (error) {
      console.error('❌ Error getting online count:', error);
      return 0;
    }
  }
};

// =====================================================
// REAL-TIME NOTIFICATIONS (NoSQL Only)
// =====================================================

export interface Notification {
  id?: string;
  userId: string;
  type: 'match' | 'message' | 'donation' | 'system';
  title: string;
  message: string;
  read: boolean;
  timestamp: string | object;
  data?: Record<string, any>;
}

export const notificationService = {
  // Send notification
  async send(notification: Omit<Notification, 'id' | 'timestamp'>): Promise<string> {
    try {
      const notificationsRef = ref(database, `notifications/${notification.userId}`);
      const newNotificationRef = push(notificationsRef);
      
      const notificationData: Notification = {
        ...notification,
        id: newNotificationRef.key!,
        timestamp: serverTimestamp(),
      };
      
      await set(newNotificationRef, notificationData);
      console.log('✅ Notification sent in Firebase (NoSQL):', newNotificationRef.key);
      return newNotificationRef.key!;
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      throw error;
    }
  },

  // Mark as read
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      const notificationRef = ref(database, `notifications/${userId}/${notificationId}`);
      await update(notificationRef, { read: true });
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  },

  // Listen to user notifications
  listenToUserNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void
  ): () => void {
    const notificationsRef = ref(database, `notifications/${userId}`);
    
    const listener = onValue(notificationsRef, (snapshot) => {
      const notifications: Notification[] = [];
      snapshot.forEach((child) => {
        notifications.push(child.val());
      });
      
      // Sort by timestamp (newest first)
      notifications.sort((a, b) => {
        const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : 0;
        const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
      
      callback(notifications);
    });

    return () => off(notificationsRef, 'value', listener);
  },

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const notificationsRef = ref(database, `notifications/${userId}`);
      const snapshot = await get(notificationsRef);
      
      let count = 0;
      snapshot.forEach((child) => {
        const notification = child.val() as Notification;
        if (!notification.read) {
          count++;
        }
      });
      
      return count;
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      return 0;
    }
  }
};

// =====================================================
// ANALYTICS CACHE (NoSQL Only - Temporary/Fast Access)
// =====================================================

export interface AnalyticsCache {
  totalDonations: number;
  totalRequests: number;
  totalMatches: number;
  activeUsers: number;
  lastUpdated: string;
}

export const analyticsCacheService = {
  // Update cache
  async update(data: Omit<AnalyticsCache, 'lastUpdated'>): Promise<void> {
    try {
      const cacheRef = ref(database, 'analytics_cache');
      await set(cacheRef, {
        ...data,
        lastUpdated: new Date().toISOString()
      });
      console.log('✅ Analytics cache updated in Firebase (NoSQL)');
    } catch (error) {
      console.error('❌ Error updating analytics cache:', error);
    }
  },

  // Get cached analytics
  async get(): Promise<AnalyticsCache | null> {
    try {
      const cacheRef = ref(database, 'analytics_cache');
      const snapshot = await get(cacheRef);
      
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting analytics cache:', error);
      return null;
    }
  },

  // Listen to cache updates
  listen(callback: (data: AnalyticsCache | null) => void): () => void {
    const cacheRef = ref(database, 'analytics_cache');
    
    const listener = onValue(cacheRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback(null);
      }
    });

    return () => off(cacheRef, 'value', listener);
  }
};

// =====================================================
// SESSION TRACKING (NoSQL Only)
// =====================================================

export interface UserSession {
  userId: string;
  sessionId: string;
  startTime: string;
  lastActivity: string | object;
  device?: string;
  browser?: string;
}

export const sessionTrackingService = {
  // Start session
  async start(userId: string, sessionId: string, device?: string): Promise<void> {
    try {
      const sessionRef = ref(database, `sessions/${userId}/${sessionId}`);
      await set(sessionRef, {
        userId,
        sessionId,
        startTime: new Date().toISOString(),
        lastActivity: serverTimestamp(),
        device: device || 'unknown',
        browser: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'
      });
      console.log('✅ Session started in Firebase (NoSQL)');
    } catch (error) {
      console.error('❌ Error starting session:', error);
    }
  },

  // Update last activity
  async updateActivity(userId: string, sessionId: string): Promise<void> {
    try {
      const sessionRef = ref(database, `sessions/${userId}/${sessionId}`);
      await update(sessionRef, {
        lastActivity: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ Error updating session activity:', error);
    }
  },

  // End session
  async end(userId: string, sessionId: string): Promise<void> {
    try {
      const sessionRef = ref(database, `sessions/${userId}/${sessionId}`);
      await remove(sessionRef);
      console.log('✅ Session ended in Firebase (NoSQL)');
    } catch (error) {
      console.error('❌ Error ending session:', error);
    }
  },

  // Get active sessions
  async getActiveSessions(userId: string): Promise<UserSession[]> {
    try {
      const sessionsRef = ref(database, `sessions/${userId}`);
      const snapshot = await get(sessionsRef);
      
      const sessions: UserSession[] = [];
      snapshot.forEach((child) => {
        sessions.push(child.val());
      });
      
      return sessions;
    } catch (error) {
      console.error('❌ Error getting active sessions:', error);
      return [];
    }
  }
};

// Consolidated export
export const firebaseNoSQLService = {
  activityFeed: activityFeedService,
  presence: userPresenceService,
  notifications: notificationService,
  analytics: analyticsCacheService,
  sessions: sessionTrackingService
};
