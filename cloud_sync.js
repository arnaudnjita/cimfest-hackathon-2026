// =========================================================================
// CIMFEST HACKATHON 2026 - REAL-TIME CLOUD & MULTI-DEVICE SYNCHRONIZER
// =========================================================================
// Supports:
// 1. Firebase Realtime Database (Private Dedicated Cloud)
// 2. High-speed Cloud WebSockets (Zero-config Instant Multi-Device Sync)
// 3. Native BroadcastChannel & localStorage (Zero-latency Local / Offline Sync)
// =========================================================================

class CloudSyncManager {
  constructor() {
    this.DEFAULT_ROOM = 'cimfest2026';
    const params = new URLSearchParams(window.location.search);
    this.roomId = params.get('room') || localStorage.getItem('cimfest_sync_room') || this.DEFAULT_ROOM;
    this.provider = 'none'; // 'firebase' | 'mqtt' | 'local'
    this.status = 'connecting'; // 'connected' | 'connecting' | 'disconnected'
    this.isStage = false;
    this.onCommand = null;
    this.onState = null;
    this.onStatusChange = null;
    this.lastSentStateTime = 0;
    this.lastProcessedCmdTimestamp = 0;
    this.lastProcessedStateTimestamp = 0;
    
    this.localChannel = null;
    this.fbDb = null;
    this.mqttClient = null;
    this.mqttConnected = false;
    
    this.initLocal();
  }

  getRoomId() {
    return this.roomId;
  }

  setRoomId(newRoom) {
    if (!newRoom || !newRoom.trim()) return;
    this.roomId = newRoom.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    localStorage.setItem('cimfest_sync_room', this.roomId);
    
    // Update URL without full reload if supported, or reload
    const url = new URL(window.location.href);
    url.searchParams.set('room', this.roomId);
    window.location.href = url.toString();
  }

  initLocal() {
    try {
      this.localChannel = new BroadcastChannel('cimfest_bus_' + this.roomId);
      this.localChannel.onmessage = (e) => {
        this.handleIncoming(e.data, 'local_broadcast');
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported');
    }

    window.addEventListener('storage', (e) => {
      if (e.key === 'cimfest_msg_' + this.roomId && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          this.handleIncoming(parsed, 'local_storage');
        } catch(err) {}
      }
    });
  }

  init(options = {}) {
    this.isStage = !!options.isStage;
    this.onCommand = options.onCommand || null;
    this.onState = options.onState || null;
    this.onStatusChange = options.onStatus || null;

    this.connect();
  }

  getFirebaseConfig() {
    // 1. Check localStorage first
    try {
      const stored = localStorage.getItem('cimfest_firebase_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.databaseURL || parsed.projectId)) return parsed;
      }
    } catch(e) {}

    // 2. Check window.FIREBASE_CONFIG from firebase_config.js
    if (window.FIREBASE_CONFIG && (window.FIREBASE_CONFIG.databaseURL || window.FIREBASE_CONFIG.projectId)) {
      return window.FIREBASE_CONFIG;
    }

    return null;
  }

  saveFirebaseConfig(configObj) {
    if (!configObj) {
      localStorage.removeItem('cimfest_firebase_config');
    } else {
      localStorage.setItem('cimfest_firebase_config', JSON.stringify(configObj));
    }
    window.location.reload();
  }

  connect() {
    const fbConfig = this.getFirebaseConfig();
    if (fbConfig && typeof firebase !== 'undefined' && firebase.initializeApp) {
      this.initFirebase(fbConfig);
    } else if (typeof Paho !== 'undefined' && Paho.MQTT && Paho.MQTT.Client) {
      this.initMQTT();
    } else {
      this.updateStatus('local', 'connected', 'Local Only (Offline)');
    }
  }

  initFirebase(config) {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      this.fbDb = firebase.database();
      this.provider = 'firebase';
      this.updateStatus('firebase', 'connected', 'Firebase Realtime Database');

      const roomRef = this.fbDb.ref('cimfest_rooms/' + this.roomId);

      if (this.isStage) {
        // Stage listens for commands
        roomRef.child('command').on('value', (snapshot) => {
          const val = snapshot.val();
          if (val) this.handleIncoming(val, 'firebase');
        });
      } else {
        // Admin listens for stage state
        roomRef.child('state').on('value', (snapshot) => {
          const val = snapshot.val();
          if (val) this.handleIncoming(val, 'firebase');
        });
      }
    } catch (err) {
      console.warn('Firebase init error, falling back to WebSockets:', err);
      if (typeof Paho !== 'undefined') {
        this.initMQTT();
      } else {
        this.updateStatus('local', 'connected', 'Local Offline');
      }
    }
  }

  initMQTT() {
    try {
      const brokerHost = 'broker.emqx.io';
      const brokerPort = 8084;
      const clientId = 'cf_' + (this.isStage ? 'stg_' : 'adm_') + Math.random().toString(16).substring(2, 10);
      
      this.mqttClient = new Paho.MQTT.Client(brokerHost, brokerPort, '/mqtt', clientId);
      this.provider = 'mqtt';
      this.updateStatus('mqtt', 'connecting', 'Connecting Cloud WebSockets...');

      this.mqttClient.onConnectionLost = (responseObject) => {
        this.mqttConnected = false;
        if (responseObject.errorCode !== 0) {
          this.updateStatus('mqtt', 'disconnected', 'Cloud Reconnecting...');
          setTimeout(() => this.connect(), 4000);
        }
      };

      this.mqttClient.onMessageArrived = (message) => {
        try {
          const data = JSON.parse(message.payloadString);
          this.handleIncoming(data, 'mqtt');
        } catch (e) {}
      };

      this.mqttClient.connect({
        useSSL: true,
        timeout: 6,
        keepAliveInterval: 30,
        cleanSession: true,
        onSuccess: () => {
          this.mqttConnected = true;
          this.updateStatus('mqtt', 'connected', 'Cloud WebSockets (Active)');
          const topic = 'cimfest/rooms/' + this.roomId + (this.isStage ? '/cmd' : '/state');
          this.mqttClient.subscribe(topic);
        },
        onFailure: (err) => {
          this.mqttConnected = false;
          console.warn('MQTT Connection error, retrying:', err);
          this.updateStatus('mqtt', 'disconnected', 'Cloud Connecting...');
          setTimeout(() => this.connect(), 5000);
        }
      });
    } catch (e) {
      console.warn('MQTT init exception:', e);
      this.updateStatus('local', 'connected', 'Local Offline');
    }
  }

  updateStatus(provider, status, details = '') {
    this.provider = provider;
    this.status = status;
    if (this.onStatusChange) {
      this.onStatusChange({ provider, status, details, roomId: this.roomId });
    }
  }

  sendCommand(message) {
    if (!message) return;
    if (!message.timestamp) message.timestamp = Date.now();
    if (!message.id) message.id = 'cmd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    // 1. Local Broadcast
    if (this.localChannel) {
      try { this.localChannel.postMessage(message); } catch(e) {}
    }
    try {
      localStorage.setItem('cimfest_msg_' + this.roomId, JSON.stringify(message));
    } catch(e) {}

    // 2. Firebase
    if (this.fbDb && this.provider === 'firebase') {
      try {
        this.fbDb.ref('cimfest_rooms/' + this.roomId + '/command').set(message);
      } catch(e) {}
    }

    // 3. MQTT
    if (this.mqttClient && this.mqttConnected && this.provider === 'mqtt') {
      try {
        const msg = new Paho.MQTT.Message(JSON.stringify(message));
        msg.destinationName = 'cimfest/rooms/' + this.roomId + '/cmd';
        this.mqttClient.send(msg);
      } catch(e) {}
    }
  }

  sendState(stateMsg) {
    if (!stateMsg) return;
    const now = Date.now();
    // Throttle cloud state push to max once every 800ms
    if (now - this.lastSentStateTime < 800) return;
    this.lastSentStateTime = now;

    if (!stateMsg.timestamp) stateMsg.timestamp = now;

    // 1. Local Broadcast
    if (this.localChannel) {
      try { this.localChannel.postMessage(stateMsg); } catch(e) {}
    }
    try {
      localStorage.setItem('cimfest_msg_' + this.roomId, JSON.stringify(stateMsg));
    } catch(e) {}

    // 2. Firebase
    if (this.fbDb && this.provider === 'firebase') {
      try {
        this.fbDb.ref('cimfest_rooms/' + this.roomId + '/state').set(stateMsg);
      } catch(e) {}
    }

    // 3. MQTT
    if (this.mqttClient && this.mqttConnected && this.provider === 'mqtt') {
      try {
        const msg = new Paho.MQTT.Message(JSON.stringify(stateMsg));
        msg.destinationName = 'cimfest/rooms/' + this.roomId + '/state';
        this.mqttClient.send(msg);
      } catch(e) {}
    }
  }

  handleIncoming(data, source) {
    if (!data) return;

    // If it's a command directed to Stage
    if (data.action && this.isStage) {
      if (data.timestamp && data.timestamp <= this.lastProcessedCmdTimestamp) {
        return; // Already processed by local or earlier message
      }
      this.lastProcessedCmdTimestamp = data.timestamp || Date.now();
      if (this.onCommand) {
        this.onCommand(data, source);
      }
    }

    // If it's a state/heartbeat update directed to Admin
    if ((data.type === 'STAGE_HEARTBEAT' || data.type === 'STAGE_STATE_SYNC') && !this.isStage) {
      if (data.timestamp && data.timestamp <= this.lastProcessedStateTimestamp) {
        return; // Older state update, skip
      }
      this.lastProcessedStateTimestamp = data.timestamp || Date.now();
      if (this.onState) {
        this.onState(data, source);
      }
    }
  }

  // Get Admin URL with Room parameter for pairing phones
  getAdminPairingUrl() {
    const loc = window.location;
    let basePath = loc.pathname;
    if (basePath.endsWith('index.html') || basePath.endsWith('cimfest_stage.html')) {
      basePath = basePath.replace(/index\.html|cimfest_stage\.html/, 'cimfest_admin.html');
    } else if (!basePath.endsWith('cimfest_admin.html')) {
      basePath = basePath.replace(/\/?$/, '/cimfest_admin.html');
    }
    return `${loc.protocol}//${loc.host}${basePath}?room=${encodeURIComponent(this.roomId)}`;
  }
}

window.CloudSyncManager = CloudSyncManager;
window.cloudSync = new CloudSyncManager();
