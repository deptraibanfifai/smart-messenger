import { Client } from '@stomp/stompjs';

class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.subscriptions = new Map();
    this.listeners = new Map();
    this.connectionListeners = new Set();
  }

  connect(user, onConnectCallback, onErrorCallback) {
    if (this.client?.active) {
      return;
    }

    const token = localStorage.getItem('smart_messenger_token');

    let currentClient;
    currentClient = new Client({
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
        if (this.client !== currentClient) return;
        this.connected = true;
        this.subscriptions.clear();
        for (const [topic, handler] of this.listeners) this.attachSubscription(topic, handler);
        console.log('🟢 [STOMP CONNECTED] Thành công kết nối WebSocket!');
        for (const listener of this.connectionListeners) listener(true);

        if (onConnectCallback) onConnectCallback();
      },
      onStompError: (frame) => {
        console.error('🔴 [STOMP ERROR]', frame.headers['message']);
        if (onErrorCallback) onErrorCallback(frame);
      },
      onWebSocketClose: () => {
        if (this.client !== currentClient) return;
        this.connected = false;
        this.subscriptions.clear();
        for (const listener of this.connectionListeners) listener(false);
        console.log('🟡 [STOMP DISCONNECTED] Kết nối WebSocket bị đóng');
      },
    });

    this.client = currentClient;
    currentClient.activate();
  }

  subscribeToConversation(conversationId, onMessageReceived) {
    const topic = `/topic/conversation/${conversationId}`;
    return this.subscribe(topic, onMessageReceived);
  }

  subscribe(topic, handler) {
    this.listeners.set(topic, handler);
    this.attachSubscription(topic, handler);
    return { unsubscribe: () => {
      // A cleanup from an older render must not remove a newer listener.
      if (this.listeners.get(topic) !== handler) return;
      this.subscriptions.get(topic)?.unsubscribe();
      this.subscriptions.delete(topic);
      this.listeners.delete(topic);
    } };
  }

  attachSubscription(topic, handler) {
    if (!this.client || !this.connected) return;
    this.subscriptions.get(topic)?.unsubscribe();
    const sub = this.client.subscribe(topic, message => {
      if (this.listeners.get(topic) !== handler) return;
      try { handler(JSON.parse(message.body)); }
      catch (error) { console.error('Không đọc được sự kiện WebSocket', error); }
    });
    this.subscriptions.set(topic, sub);
  }

  subscribeToPresence(onPresenceReceived) {
    const topic = `/topic/presence`;
    return this.subscribe(topic, onPresenceReceived);
  }

  onConnectionChange(listener) {
    this.connectionListeners.add(listener);
    if (this.connected) listener(true);
    return () => this.connectionListeners.delete(listener);
  }

  sendMessage(conversationId, senderId, content, messageType = 'TEXT', replyToId = null) {
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
        replyToId,
      }),
    });
    return true;
  }

  sendTyping(conversationId, typing) {
    if (!this.client || !this.connected || !conversationId) return false;
    this.client.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify({ conversationId, typing }),
    });
    return true;
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.connected = false;
      for (const listener of this.connectionListeners) listener(false);
    }
    this.subscriptions.clear();
  }
}

export const wsService = new WebSocketService();
