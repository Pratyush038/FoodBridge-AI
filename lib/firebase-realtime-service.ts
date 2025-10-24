import { 
  ref, 
  push, 
  set, 
  onValue, 
  off, 
  update,
  serverTimestamp
} from 'firebase/database';
import { database } from './firebase';

// =====================================================
// REAL-TIME DATA INTERFACES
// =====================================================

export interface DonationLog {
  id?: string;
  donationId: string; // Reference to Supabase food_item
  donorId: string; // Reference to Supabase donor
  ngoId: string; // Reference to Supabase ngo
  transactionId: string; // Reference to Supabase transaction
  action: 'created' | 'matched' | 'picked_up' | 'delivered' | 'completed' | 'cancelled';
  timestamp: string | object;
  details?: Record<string, any>;
}

export interface ChatMessage {
  id?: string;
  transactionId: string;
  senderId: string;
  senderName: string;
  senderRole: 'donor' | 'ngo';
  message: string;
  timestamp: string | object;
  read: boolean;
}

export interface LiveUpdate {
  id?: string;
  type: 'donation' | 'request' | 'match' | 'delivery' | 'system';
  title: string;
  message: string;
  userId?: string; // If update is for specific user
  data?: Record<string, any>;
  timestamp: string | object;
  priority: 'low' | 'medium' | 'high';
}

export interface AIMatchPredictionCache {
  predictions: any[];
  generatedAt: string;
  count: number;
}

// =====================================================
// DONATION LOGS - Real-time Activity Tracking
// =====================================================

export const donationLogService = {
  // Create a new donation log entry
  async create(log: Omit<DonationLog, 'id' | 'timestamp'>): Promise<string> {
    try {
      const logsRef = ref(database, 'donation_logs');
      const newLogRef = push(logsRef);
      
      const logData: DonationLog = {
        ...log,
        id: newLogRef.key!,
        timestamp: serverTimestamp(),
      };
      
      await set(newLogRef, logData);
      console.log('✅ Donation log created:', newLogRef.key);
      return newLogRef.key!;
    } catch (error) {
      console.error('Error creating donation log:', error);
      throw error;
    }
  },

  // Listen to donation logs for a specific transaction
  listenToTransactionLogs(
    transactionId: string,
    callback: (logs: DonationLog[]) => void
  ): () => void {
    const logsRef = ref(database, 'donation_logs');
    
    const listener = onValue(logsRef, (snapshot) => {
      const logs: DonationLog[] = [];
      snapshot.forEach((child) => {
        const log = child.val();
        if (log.transactionId === transactionId) {
          logs.push(log);
        }
      });
      
      // Sort by timestamp (newest first)
      logs.sort((a, b) => {
        const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : 0;
        const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
      
      callback(logs);
    });

    // Return unsubscribe function
    return () => off(logsRef, 'value', listener);
  },

  // Listen to all recent logs (for admin dashboard)
  listenToRecentLogs(
    limit: number,
    callback: (logs: DonationLog[]) => void
  ): () => void {
    const logsRef = ref(database, 'donation_logs');
    
    const listener = onValue(logsRef, (snapshot) => {
      const logs: DonationLog[] = [];
      snapshot.forEach((child) => {
        logs.push(child.val());
      });
      
      // Sort and limit
      logs.sort((a, b) => {
        const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : 0;
        const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
      
      callback(logs.slice(0, limit));
    });

    return () => off(logsRef, 'value', listener);
  },
};

// =====================================================
// CHAT MESSAGES - Real-time Communication
// =====================================================

export const chatService = {
  // Send a chat message
  async sendMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<string> {
    try {
      const messagesRef = ref(database, `chats/${message.transactionId}/messages`);
      const newMessageRef = push(messagesRef);
      
      const messageData: ChatMessage = {
        ...message,
        id: newMessageRef.key!,
        timestamp: serverTimestamp(),
      };
      
      await set(newMessageRef, messageData);
      console.log('✅ Chat message sent:', newMessageRef.key);
      return newMessageRef.key!;
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  },

  // Mark messages as read
  async markAsRead(transactionId: string, messageIds: string[]): Promise<void> {
    try {
      const updates: Record<string, any> = {};
      
      messageIds.forEach((messageId) => {
        updates[`chats/${transactionId}/messages/${messageId}/read`] = true;
      });
      
      await update(ref(database), updates);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  },

  // Listen to chat messages for a transaction
  listenToChat(
    transactionId: string,
    callback: (messages: ChatMessage[]) => void
  ): () => void {
    const messagesRef = ref(database, `chats/${transactionId}/messages`);
    
    const listener = onValue(messagesRef, (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((child) => {
        messages.push(child.val());
      });
      
      // Sort by timestamp
      messages.sort((a, b) => {
        const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : 0;
        const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : 0;
        return timeA - timeB;
      });
      
      callback(messages);
    });

    return () => off(messagesRef, 'value', listener);
  },

  // Get unread message count
  listenToUnreadCount(
    transactionId: string,
    userId: string,
    callback: (count: number) => void
  ): () => void {
    const messagesRef = ref(database, `chats/${transactionId}/messages`);
    
    const listener = onValue(messagesRef, (snapshot) => {
      let unreadCount = 0;
      snapshot.forEach((child) => {
        const message = child.val() as ChatMessage;
        if (message.senderId !== userId && !message.read) {
          unreadCount++;
        }
      });
      
      callback(unreadCount);
    });

    return () => off(messagesRef, 'value', listener);
  },
};

// =====================================================
// LIVE UPDATES - Real-time Notifications
// =====================================================

export const liveUpdateService = {
  // Publish a live update
  async publish(update: Omit<LiveUpdate, 'id' | 'timestamp'>): Promise<string> {
    try {
      const updatesRef = ref(database, 'live_updates');
      const newUpdateRef = push(updatesRef);
      
      const updateData: LiveUpdate = {
        ...update,
        id: newUpdateRef.key!,
        timestamp: serverTimestamp(),
      };
      
      await set(newUpdateRef, updateData);
      console.log('✅ Live update published:', newUpdateRef.key);
      return newUpdateRef.key!;
    } catch (error) {
      console.error('Error publishing live update:', error);
      throw error;
    }
  },

  // Listen to all live updates
  listenToAll(callback: (updates: LiveUpdate[]) => void): () => void {
    const updatesRef = ref(database, 'live_updates');
    
    const listener = onValue(updatesRef, (snapshot) => {
      const updates: LiveUpdate[] = [];
      snapshot.forEach((child) => {
        updates.push(child.val());
      });
      
      // Sort by timestamp (newest first)
      updates.sort((a, b) => {
        const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : 0;
        const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
      
      // Limit to recent 100 updates
      callback(updates.slice(0, 100));
    });

    return () => off(updatesRef, 'value', listener);
  },

  // Listen to updates for a specific user
  listenToUser(userId: string, callback: (updates: LiveUpdate[]) => void): () => void {
    const updatesRef = ref(database, 'live_updates');
    
    const listener = onValue(updatesRef, (snapshot) => {
      const updates: LiveUpdate[] = [];
      snapshot.forEach((child) => {
        const update = child.val();
        // Include updates for this user or global updates (no userId)
        if (!update.userId || update.userId === userId) {
          updates.push(update);
        }
      });
      
      updates.sort((a, b) => {
        const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : 0;
        const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
      
      callback(updates.slice(0, 50));
    });

    return () => off(updatesRef, 'value', listener);
  },
};

// =====================================================
// AI PREDICTIONS CACHE - Real-time AI Matching Results
// =====================================================

export const aiPredictionService = {
  // Store AI predictions
  async store(predictions: any[]): Promise<void> {
    try {
      const predictionsRef = ref(database, 'ai_predictions');
      const data: AIMatchPredictionCache = {
        predictions: predictions.slice(0, 50), // Top 50
        generatedAt: new Date().toISOString(),
        count: predictions.length,
      };
      
      await set(predictionsRef, data);
      console.log(`✅ Stored ${predictions.length} AI predictions in Firebase`);
    } catch (error) {
      console.error('Error storing AI predictions:', error);
      throw error;
    }
  },

  // Listen to AI predictions
  listenToPredictions(
    callback: (cache: AIMatchPredictionCache | null) => void
  ): () => void {
    const predictionsRef = ref(database, 'ai_predictions');
    
    const listener = onValue(predictionsRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback(null);
      }
    });

    return () => off(predictionsRef, 'value', listener);
  },
};

// Export consolidated service
export const firebaseRealtimeService = {
  donationLogs: donationLogService,
  chat: chatService,
  liveUpdates: liveUpdateService,
  aiPredictions: aiPredictionService,
};
