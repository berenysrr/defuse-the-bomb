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

    // LocalStorage ile sekmeler ve yerel cihazlar arası anlık dinleme
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key && event.key.startsWith('room_state_')) {
          try {
            const data = JSON.parse(event.newValue);
            this.handleMessage(data);
          } catch (e) {}
        }
      });
    }
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

    const payload = {
      type: 'STATE_UPDATE',
      roomCode: code,
      state: roomState,
      lastUpdate: Date.now()
    };

    this.saveAndBroadcast(payload);
    return code;
  }

  // 2. ODAYA KATIL
  joinRoom(code, playerConfig) {
    const cleanCode = code.toUpperCase();
    this.roomCode = cleanCode;
    this.isHost = false;

    // Var olan oda verisini al
    let roomState = this.getRoomState(cleanCode) || {
      code: cleanCode,
      players: [],
      gameState: 'LOBBY',
      lastUpdate: Date.now()
    };

    // Oyuncu daha önce eklenmediyse listeye ekle
    const exists = roomState.players.some(p => p.name === playerConfig.name || p.id === playerConfig.id);
    if (!exists) {
      roomState.players.push(playerConfig);
    }

    const payload = {
      type: 'STATE_UPDATE',
      roomCode: cleanCode,
      state: roomState,
      lastUpdate: Date.now()
    };

    this.saveAndBroadcast(payload);
    return roomState;
  }

  getRoomState(code) {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`room_state_${code}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.state || parsed;
      }
    } catch (e) {}
    return null;
  }

  saveAndBroadcast(payload) {
    if (typeof localStorage !== 'undefined' && payload.roomCode) {
      localStorage.setItem(`room_state_${payload.roomCode}`, JSON.stringify(payload));
    }
    if (this.channel) {
      this.channel.postMessage(payload);
    }
    this.notifyListeners(payload);
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
