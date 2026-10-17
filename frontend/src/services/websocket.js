import { Client } from '@stomp/stompjs';

class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.subscriptions = new Map();
    this.listeners = new Map();
  }

  connect(user, onConnectCallback, onErrorCallback) {
    if (this.client && this.connected) {
      return;
    }

    const token = localStorage.getItem('smart_messenger_token');

    this.client = new Client({
      brokerURL: `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws-native`,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (str) => {
        // console.log('[STOMP DEBUG]', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        this.connected = true;
        for (const [topic, handler] of this.listeners) this.subscribe(topic, handler);
        console.log('🟢 [STOMP CONNECTED] Thành công kết nối WebSocket!');

        // Báo danh user online
        if (user && user.id) {
          this.client.publish({
            destination: '/app/presence.online',
            body: JSON.stringify({ userId: user.id, username: user.username }),
          });
        }

        if (onConnectCallback) onConnectCallback();
      },
      onStompError: (frame) => {
        console.error('🔴 [STOMP ERROR]', frame.headers['message']);
        if (onErrorCallback) onErrorCallback(frame);
      },
      onWebSocketClose: () => {
        this.connected = false;
        console.log('🟡 [STOMP DISCONNECTED] Kết nối WebSocket bị đóng');
      },
    });

    this.client.activate();
  }

  subscribeToConversation(conversationId, onMessageReceived) {
    const topic = `/topic/conversation/${conversationId}`;
    return this.subscribe(topic, onMessageReceived);
  }

  subscribe(topic, handler) {
    this.listeners.set(topic, handler);
    if (!this.client || !this.connected) return { unsubscribe: () => this.listeners.delete(topic) };
    if (this.subscriptions.has(topic)) {
      this.subscriptions.get(topic).unsubscribe();
    }

    const sub = this.client.subscribe(topic, (message) => {
      const payload = JSON.parse(message.body);
      handler(payload);
    });

    this.subscriptions.set(topic, sub);
    return { unsubscribe: () => { this.subscriptions.get(topic)?.unsubscribe(); this.subscriptions.delete(topic); this.listeners.delete(topic); } };
  }

  subscribeToPresence(onPresenceReceived) {
    const topic = `/topic/presence`;
    return this.subscribe(topic, onPresenceReceived);
  }

  sendMessage(conversationId, senderId, content, messageType = 'TEXT') {
    if (!this.client || !this.connected) {
      console.error('Không thể gửi tin: WebSocket chưa kết nối');
      return false;
    }

    this.client.publish({
      destination: '/app/chat.sendMessage',
      body: JSON.stringify({
        conversationId,
        content,
        messageType,
      }),
    });
    return true;
  }

  disconnect(user) {
    if (this.client && this.connected) {
      if (user && user.id) {
        try {
          this.client.publish({
            destination: '/app/presence.offline',
            body: JSON.stringify({ userId: user.id, username: user.username }),
          });
        } catch (e) {
          // ignore
        }
      }
      this.client.deactivate();
      this.connected = false;
    }
    this.subscriptions.clear();
    this.listeners.clear();
  }
}

export const wsService = new WebSocketService();
