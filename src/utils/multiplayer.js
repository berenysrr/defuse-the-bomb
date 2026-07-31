import { Peer } from 'peerjs';

class RoomManager {
  constructor() {
    this.roomCode = null;
    this.isHost = false;
    this.listeners = [];
    this.channel = null;
    this.peer = null;
    this.connections = []; // Host tarafi baglantilari
    this.hostConn = null;  // Joiner tarafi host baglantisi
    this.roomState = null;

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

    this.roomState = {
      code,
      hostId: hostPlayerConfig.id,
      players: [hostPlayerConfig],
      gameState: 'LOBBY',
      lastUpdate: Date.now()
    };

    // PeerJS Global İnternet Sunucusu Bağlantısı
    const peerId = `defuse-bomb-${code}`;
    try {
      this.peer = new Peer(peerId);

      this.peer.on('connection', (conn) => {
        this.connections.push(conn);

        conn.on('data', (data) => {
          if (data.type === 'JOIN_REQUEST' && data.player) {
            // Katılan yeni oyuncuyu oda listesine ekle
            const exists = this.roomState.players.some(p => p.id === data.player.id || p.name === data.player.name);
            if (!exists) {
              this.roomState.players.push(data.player);
            }
            this.broadcastRoomState();
          }
        });

        conn.on('open', () => {
          conn.send({ type: 'STATE_UPDATE', roomCode: code, state: this.roomState });
        });
      });
    } catch (e) {
      console.warn('PeerJS init fallback:', e);
    }

    const payload = {
      type: 'STATE_UPDATE',
      roomCode: code,
      state: this.roomState,
      lastUpdate: Date.now()
    };

    this.saveAndBroadcast(payload);
    return code;
  }

  // 2. ODAYA KATIL (Joiner)
  joinRoom(code, playerConfig) {
    const cleanCode = code.toUpperCase();
    this.roomCode = cleanCode;
    this.isHost = false;

    const peerId = `defuse-bomb-joiner-${Date.now()}`;
    try {
      this.peer = new Peer(peerId);

      this.peer.on('open', () => {
        const hostPeerId = `defuse-bomb-${cleanCode}`;
        const conn = this.peer.connect(hostPeerId);
        this.hostConn = conn;

        conn.on('open', () => {
          conn.send({ type: 'JOIN_REQUEST', roomCode: cleanCode, player: playerConfig });
        });

        conn.on('data', (data) => {
          this.handleMessage(data);
        });
      });
    } catch (e) {
      console.warn('PeerJS join fallback:', e);
    }

    let roomState = this.getRoomState(cleanCode) || {
      code: cleanCode,
      players: [playerConfig],
      gameState: 'LOBBY',
      lastUpdate: Date.now()
    };

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

  // Host Oyunu Başlattığında Tüm Cihazlara Bildir
  startGameBroadcast(players) {
    if (this.roomState) {
      this.roomState.gameState = 'PLAYING';
      this.roomState.players = players;
    }

    const payload = {
      type: 'GAME_START',
      roomCode: this.roomCode,
      players: players,
      lastUpdate: Date.now()
    };

    this.saveAndBroadcast(payload);

    // PeerJS üzerinden tüm katılımcılara gönder
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send(payload);
      }
    });
  }

  broadcastRoomState() {
    const payload = {
      type: 'STATE_UPDATE',
      roomCode: this.roomCode,
      state: this.roomState,
      lastUpdate: Date.now()
    };

    this.saveAndBroadcast(payload);

    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send(payload);
      }
    });
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
    if (data.type === 'STATE_UPDATE' && data.state) {
      this.roomState = data.state;
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
