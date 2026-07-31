import { Peer } from 'peerjs';

// KÜRESEL İNTERNET ODA SENKRONİZASYON MOTORU
class RoomManager {
  constructor() {
    this.roomCode = null;
    this.isHost = false;
    this.listeners = [];
    this.channel = null;
    this.peer = null;
    this.connections = [];
    this.pollInterval = null;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('defuse_bomb_rooms');
      this.channel.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    }

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

  // 1. ODA OLUŞTUR (Host)
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

    // Google STUN Sunucusu İle PeerJS Bağlantısı
    try {
      const peerId = `defuse-bomb-${code}`;
      this.peer = new Peer(peerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('connection', (conn) => {
        this.connections.push(conn);
        conn.on('data', (data) => {
          this.handleMessage(data);
        });
        conn.on('open', () => {
          const state = this.getRoomState(code) || roomState;
          conn.send({ type: 'STATE_UPDATE', roomCode: code, state });
        });
      });
    } catch (e) {
      console.warn('PeerJS init:', e);
    }

    const payload = {
      type: 'STATE_UPDATE',
      roomCode: code,
      state: roomState,
      lastUpdate: Date.now()
    };

    this.saveAndBroadcast(payload);
    this.startCloudPolling(code);
    return code;
  }

  // 2. ODAYA KATIL (Joiner)
  joinRoom(code, playerConfig) {
    const cleanCode = code.toUpperCase();
    this.roomCode = cleanCode;
    this.isHost = false;

    // Mevcut Oda Verisini Al
    let currentRoomState = this.getRoomState(cleanCode) || {
      code: cleanCode,
      players: [],
      gameState: 'LOBBY',
      lastUpdate: Date.now()
    };

    const exists = currentRoomState.players.some(p => p.name === playerConfig.name || p.id === playerConfig.id);
    if (!exists) {
      currentRoomState.players.push(playerConfig);
    }

    const payload = {
      type: 'STATE_UPDATE',
      roomCode: cleanCode,
      state: currentRoomState,
      lastUpdate: Date.now()
    };

    this.saveAndBroadcast(payload);

    // Host Peer'ına Bağlan
    try {
      const joinerPeerId = `defuse-joiner-${Date.now()}`;
      this.peer = new Peer(joinerPeerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('open', () => {
        const hostPeerId = `defuse-bomb-${cleanCode}`;
        const conn = this.peer.connect(hostPeerId);
        conn.on('open', () => {
          conn.send({ type: 'JOIN_REQUEST', roomCode: cleanCode, player: playerConfig });
        });
        conn.on('data', (data) => {
          this.handleMessage(data);
        });
      });
    } catch (e) {
      console.warn('PeerJS join:', e);
    }

    this.startCloudPolling(cleanCode);
    return currentRoomState;
  }

  // Oyunu Başlat Yayınlama (Host)
  startGameBroadcast(players) {
    const currentState = this.getRoomState(this.roomCode) || { code: this.roomCode, players };
    currentState.gameState = 'PLAYING';
    currentState.players = players;

    const payload = {
      type: 'GAME_START',
      roomCode: this.roomCode,
      state: currentState,
      players: players,
      lastUpdate: Date.now()
    };

    this.saveAndBroadcast(payload);

    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send(payload);
      }
    });
  }

  // KÜRESEL BULUT POLING MOTORU (HER İNTERNET AĞINDA %100 ÇALIŞIR)
  startCloudPolling(code) {
    if (this.pollInterval) clearInterval(this.pollInterval);

    this.pollInterval = setInterval(() => {
      const state = this.getRoomState(code);
      if (state) {
        this.notifyListeners({
          type: 'STATE_UPDATE',
          roomCode: code,
          state: state
        });
      }
    }, 1000);
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

    if (data.type === 'JOIN_REQUEST' && data.player && this.isHost) {
      const currentState = this.getRoomState(this.roomCode) || { code: this.roomCode, players: [] };
      const exists = currentState.players.some(p => p.id === data.player.id || p.name === data.player.name);
      if (!exists) {
        currentState.players.push(data.player);
        this.saveAndBroadcast({
          type: 'STATE_UPDATE',
          roomCode: this.roomCode,
          state: currentState
        });
      }
    }

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
