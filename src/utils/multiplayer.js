// %100 GOOGLE STUN SUPPORTED WEBRTC P2P REALTIME MULTIPLAYER ODA MOTORU

import Peer from 'peerjs';

const PEER_CONFIG = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ]
  }
};

class RoomManager {
  constructor() {
    this.roomCode = null;
    this.isHost = false;
    this.myPlayer = null;
    this.peer = null;
    this.connections = []; // Host: Katılan tüm oyuncuların WebRTC kanalları
    this.hostConn = null; // Joiner: Kurucuya olan WebRTC kanalı
    this.listeners = [];

    this.roomState = {
      code: null,
      players: [],
      gameState: 'LOBBY',
      inGameState: null
    };
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

    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
    }

    // Google STUN Destekli PeerJS Oda Sunucusu
    const peerId = `defuse_room_${code}`;
    this.peer = new Peer(peerId, PEER_CONFIG);
    this.connections = [];

    this.peer.on('open', (id) => {
      console.log('Host WebRTC STUN Oda Açıldı:', id);
    });

    // Yeni Oyuncu Bağlandığında (P2P NAT Traversal Handshake)
    this.peer.on('connection', (conn) => {
      console.log('Katılan oyuncu WebRTC ile başarıyla bağlandı!');
      this.connections.push(conn);

      conn.on('data', (data) => {
        this.handlePayload(data);
      });

      // Bağlantı tamamlandığı an o anki güncel durumu katılana ilet
      conn.on('open', () => {
        conn.send({
          type: 'STATE_UPDATE',
          roomCode: code,
          state: this.roomState
        });
      });
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

    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
    }

    this.peer = new Peer(PEER_CONFIG);

    this.peer.on('open', () => {
      // Doğrudan Host'a Google STUN yardımıyla 4G/Wi-Fi fark etmeksizin bağlan
      const conn = this.peer.connect(`defuse_room_${cleanCode}`, { reliable: true });
      this.hostConn = conn;

      const sendJoin = () => {
        if (conn.open) {
          console.log('Host ile P2P WebRTC Bağlantısı Başarılı!');
          conn.send({
            type: 'JOIN_REQUEST',
            roomCode: cleanCode,
            player: joinerObj
          });
        }
      };

      conn.on('open', () => {
        sendJoin();
      });

      conn.on('data', (data) => {
        this.handlePayload(data);
      });

      // Ağ gecikmesine karşı 1sn ve 2sn sonra el sıkışmayı tekrarla
      setTimeout(sendJoin, 1000);
      setTimeout(sendJoin, 2000);
    });

    this.notifyListeners({
      type: 'STATE_UPDATE',
      roomCode: cleanCode,
      state: this.roomState
    });

    return this.roomState;
  }

  // Oyuncu Birleştirme Motoru
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

  // Veri Yayınlama (Host -> Tüm Katılanlara, Joiner -> Host'a)
  publishPayload(payload) {
    if (this.isHost) {
      this.connections.forEach(conn => {
        if (conn && conn.open) {
          try { conn.send(payload); } catch (e) {}
        }
      });
    } else if (this.hostConn && this.hostConn.open) {
      try { this.hostConn.send(payload); } catch (e) {}
    }
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

  // GELEN P2P VERİLERİNİ İŞLE
  handlePayload(payload) {
    if (!payload) return;

    // A) Katılan Oyuncu İsteyi (Host Tarafında)
    if (payload.type === 'JOIN_REQUEST' && payload.player) {
      const merged = this.mergePlayerLists(this.roomState.players, [payload.player]);
      this.roomState.players = merged;

      if (this.isHost) {
        this.publishPayload({
          type: 'STATE_UPDATE',
          roomCode: this.roomCode,
          state: this.roomState
        });
      }

      this.notifyListeners({
        type: 'STATE_UPDATE',
        roomCode: this.roomCode,
        state: this.roomState
      });
    }

    // B) Güncel Oda Durumu (Katılan Tarafında)
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

    // C) Oyunu Başlat Emri
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