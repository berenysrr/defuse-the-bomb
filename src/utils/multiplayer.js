// Gerçek Zamanlı Yerel Ağ / Oda (Room) Senkronizasyon Motoru

class RoomManager {
  constructor() {
    this.roomCode = null;
    this.isHost = false;
    this.listeners = [];
    this.channel = null;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('defuse_bomb_rooms');
      this.channel.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    }

    // LocalStorage fallback for multi-tab/device sync
    window.addEventListener('storage', (event) => {
      if (event.key && event.key.startsWith('room_data_')) {
        try {
          const data = JSON.parse(event.newValue);
          this.handleMessage(data);
        } catch (e) {}
      }
    });
  }

  // 1. ODA OLUŞTUR
  createRoom(hostPlayerConfig) {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.roomCode = code;
    this.isHost = true;

    const roomState = {
      code,
      hostId: hostPlayerConfig.id,
      players: [hostPlayerConfig],
      gameState: 'LOBBY',
      lastUpdate: Date.now()
    };

    this.broadcastState(roomState);
    return code;
  }

  // 2. ODAYA KATIL
  joinRoom(code, playerConfig) {
    this.roomCode = code.toUpperCase();
    this.isHost = false;

    const payload = {
      type: 'PLAYER_JOIN_REQUEST',
      roomCode: this.roomCode,
      player: playerConfig,
      lastUpdate: Date.now()
    };

    this.broadcastMessage(payload);
  }

  // YAYIN YAP (BROADCAST)
  broadcastState(state) {
    const payload = { type: 'STATE_UPDATE', roomCode: state.code, state, lastUpdate: Date.now() };
    this.broadcastMessage(payload);
  }

  broadcastMessage(data) {
    if (this.channel) {
      this.channel.postMessage(data);
    }
    if (typeof localStorage !== 'undefined' && data.roomCode) {
      localStorage.setItem(`room_data_${data.roomCode}`, JSON.stringify(data));
    }
    this.notifyListeners(data);
  }

  handleMessage(data) {
    if (!data || data.roomCode !== this.roomCode) return;
    this.notifyListeners(data);
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
