// %100 GERÇEK ZAMANLI LÜKS MQTT WEBSOCKET RETAIN ODA VE OYUN MOTORU (50MS INSTANT SYNC)

import mqtt from 'mqtt';

const MQTT_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://test.mosquitto.org:8081/mqtt'
];

class RoomManager {
  constructor() {
    this.roomCode = null;
    this.isHost = false;
    this.myPlayer = null;
    this.listeners = [];
    this.client = null;

    this.roomState = {
      code: null,
      players: [],
      gameState: 'LOBBY',
      inGameState: null
    };
  }

  // MQTT WebSocket Bağlantısı Kur (Retain Destekli)
  initMQTT(code, onConnected = null) {
    if (this.client) {
      try { this.client.end(); } catch (e) {}
    }

    const topic = `defuse_bomb_v2/room/${code}`;
    let brokerIdx = 0;

    const connectToBroker = (url) => {
      try {
        this.client = mqtt.connect(url, {
          clientId: `defuse_p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          keepalive: 30,
          reconnectPeriod: 2000,
          connectTimeout: 5000
        });

        this.client.on('connect', () => {
          console.log("MQTT WebSocket Bağlantısı Kuruldu:", url);
          this.client.subscribe(topic, { qos: 1 }, () => {
            if (onConnected) onConnected();
          });
        });

        this.client.on('message', (t, messageBuffer) => {
          try {
            const payload = JSON.parse(messageBuffer.toString());
            this.handlePayload(payload);
          } catch (e) {}
        });

        this.client.on('error', () => {
          brokerIdx = (brokerIdx + 1) % MQTT_BROKERS.length;
          connectToBroker(MQTT_BROKERS[brokerIdx]);
        });
      } catch (e) {}
    };

    connectToBroker(MQTT_BROKERS[0]);
  }

  // 1. ODA OLUŞTUR (Host)
  async createRoom(hostPlayerConfig) {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.roomCode = code;
    this.isHost = true;

    const hostObj = {
      ...hostPlayerConfig,
      id: hostPlayerConfig.id || Date.now(),
      isHost: true
    };
    this.myPlayer = hostObj;

    this.roomState = {
      code,
      hostId: hostObj.id,
      players: [hostObj],
      gameState: 'LOBBY',
      inGameState: null
    };

    // MQTT WebSocket başlat ve odayı kalıcı duyur (retain: true)
    this.initMQTT(code, () => {
      this.publishStateUpdate();
    });

    this.notifyListeners({
      type: 'STATE_UPDATE',
      roomCode: code,
      state: this.roomState
    });

    return code;
  }

  // 2. ODAYA KATIL (Joiner)
  async joinRoom(code, playerConfig) {
    const cleanCode = code.trim().toUpperCase();
    this.roomCode = cleanCode;
    this.isHost = false;

    const joinerObj = {
      ...playerConfig,
      id: playerConfig.id || Date.now(),
      isHost: false
    };
    this.myPlayer = joinerObj;

    this.roomState = {
      code: cleanCode,
      players: [joinerObj],
      gameState: 'LOBBY',
      inGameState: null
    };

    // MQTT WebSocket başlat
    this.initMQTT(cleanCode, () => {
      // Katıldığını bildir
      this.publishPayload({
        type: 'JOIN_REQUEST',
        roomCode: cleanCode,
        player: joinerObj
      });
    });

    this.notifyListeners({
      type: 'STATE_UPDATE',
      roomCode: cleanCode,
      state: this.roomState
    });

    return this.roomState;
  }

  // Akıllı Oyuncu Birleştirme Motoru
  mergePlayerLists(listA = [], listB = []) {
    const merged = [...listA];

    listB.forEach(item => {
      if (!item || !item.id) return;
      const exists = merged.some(p => p.id === item.id);
      if (!exists) {
        merged.push(item);
      }
    });

    if (this.myPlayer && !merged.some(p => p.id === this.myPlayer.id)) {
      merged.push(this.myPlayer);
    }

    merged.sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0));
    return merged;
  }

  publishStateUpdate() {
    this.publishPayload({
      type: 'STATE_UPDATE',
      roomCode: this.roomCode,
      state: this.roomState
    });
  }

  publishPayload(payload) {
    if (!this.client || !this.roomCode) return;
    const topic = `defuse_bomb_v2/room/${this.roomCode}`;
    try {
      // retain: true sayesinde oda durumları bulutta saklanır ve yeni giren cihazlar anında alır!
      this.client.publish(topic, JSON.stringify(payload), { qos: 1, retain: true });
    } catch (e) {}
  }

  // 3. OYUNU BAŞLAT (Host)
  async startGameBroadcast(players, initialInGameState = null) {
    if (!this.roomCode) return;

    this.roomState.gameState = 'PLAYING';
    this.roomState.players = players;

    const payload = {
      type: 'GAME_START',
      roomCode: this.roomCode,
      players: players,
      inGameState: initialInGameState
    };

    this.publishPayload(payload);
    this.notifyListeners(payload);
  }

  // 4. OYUN İÇİ CANLI YAYIN
  async broadcastInGameState(inGameStatePayload) {
    if (!this.roomCode) return;

    this.roomState.inGameState = inGameStatePayload;

    const payload = {
      type: 'GAME_STATE_UPDATE',
      roomCode: this.roomCode,
      inGameState: inGameStatePayload
    };

    this.publishPayload(payload);
    this.notifyListeners(payload);
  }

  // GELEN PAYLOAD'LARI ANINDA İŞLE
  handlePayload(payload) {
    if (!payload || payload.roomCode !== this.roomCode) return;

    // A) Katılan Oyuncu İsteyi Geldiğinde
    if (payload.type === 'JOIN_REQUEST' && payload.player) {
      const merged = this.mergePlayerLists(this.roomState.players, [payload.player]);
      this.roomState.players = merged;

      if (this.isHost) {
        this.publishStateUpdate();
      }

      this.notifyListeners({
        type: 'STATE_UPDATE',
        roomCode: this.roomCode,
        state: this.roomState
      });
    }

    // B) Güncel Oda Durumu Geldiğinde
    if (payload.type === 'STATE_UPDATE' && payload.state && Array.isArray(payload.state.players)) {
      const merged = this.mergePlayerLists(this.roomState.players, payload.state.players);
      this.roomState = {
        ...payload.state,
        players: merged
      };

      this.notifyListeners({
        type: 'STATE_UPDATE',
        roomCode: this.roomCode,
        state: this.roomState
      });
    }

    // C) Oyunu Başlat Emri Geldiğinde
    if (payload.type === 'GAME_START') {
      this.roomState.gameState = 'PLAYING';
      if (payload.players && payload.players.length > 0) {
        this.roomState.players = payload.players;
      }
      this.notifyListeners({
        type: 'GAME_START',
        roomCode: this.roomCode,
        players: this.roomState.players,
        inGameState: payload.inGameState
      });
    }

    // D) Canlı Hamle Senkronizasyonu
    if (payload.type === 'GAME_STATE_UPDATE' && payload.inGameState) {
      this.roomState.inGameState = payload.inGameState;
      this.notifyListeners({
        type: 'GAME_STATE_UPDATE',
        roomCode: this.roomCode,
        inGameState: payload.inGameState
      });
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners(data) {
    this.listeners.forEach(cb => cb(data));
  }
}

export const roomManager = new RoomManager();