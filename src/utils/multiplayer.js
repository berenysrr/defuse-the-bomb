// GÜVENİLİR KÜRESEL İNTERNET ODA SENKRONİZASYON MOTORU (NTFY.SH REAL-TIME PUBSUB)

class RoomManager {
  constructor() {
    this.roomCode = null;
    this.isHost = false;
    this.listeners = [];
    this.eventSource = null;
    this.roomState = {
      code: null,
      players: [],
      gameState: 'LOBBY'
    };
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
      gameState: 'LOBBY'
    };

    // Küresel Canlı PubSub Kanalına Abone Ol
    this.subscribeToGlobalChannel(code);

    // Oda Kuruldu Yayın Yap
    this.broadcastStateToCloud(this.roomState);
    return code;
  }

  // 2. ODAYA KATIL (Joiner)
  joinRoom(code, playerConfig) {
    const cleanCode = code.toUpperCase();
    this.roomCode = cleanCode;
    this.isHost = false;

    this.roomState = {
      code: cleanCode,
      players: [playerConfig],
      gameState: 'LOBBY'
    };

    // Küresel Canlı PubSub Kanalına Abone Ol
    this.subscribeToGlobalChannel(cleanCode);

    // Host'a Katılma İsteği Gönder (JOIN_REQUEST)
    const joinPayload = {
      type: 'JOIN_REQUEST',
      roomCode: cleanCode,
      player: playerConfig
    };
    this.publishToCloud(cleanCode, joinPayload);

    return this.roomState;
  }

  // 3. KÜRESEL PUBSUB KANALINA CANLI ABONE OL (NTFY.SH REAL-TIME SSE)
  subscribeToGlobalChannel(code) {
    if (this.eventSource) {
      this.eventSource.close();
    }

    const channelUrl = `https://ntfy.sh/defuse_bomb_room_${code}/json`;
    this.eventSource = new EventSource(channelUrl);

    this.eventSource.onmessage = (event) => {
      try {
        const messageData = JSON.parse(event.data);
        if (messageData && messageData.message) {
          const payload = JSON.parse(messageData.message);
          this.handleCloudPayload(payload);
        }
      } catch (e) {}
    };
  }

  // Buluttan Gelen Mesajları İşle
  handleCloudPayload(payload) {
    if (!payload || payload.roomCode !== this.roomCode) return;

    // A) Oda Kurucusu (Host) Yeni Katılan Oyuncuyu Kabul Eder
    if (payload.type === 'JOIN_REQUEST' && payload.player && this.isHost) {
      const exists = this.roomState.players.some(p => p.id === payload.player.id || p.name === payload.player.name);
      if (!exists) {
        this.roomState.players.push(payload.player);
        this.broadcastStateToCloud(this.roomState);
      }
    }

    // B) Katılımcılar Güncel Oda Durumunu Alır
    if (payload.type === 'STATE_UPDATE' && payload.state) {
      this.roomState = payload.state;
      this.notifyListeners({
        type: 'STATE_UPDATE',
        roomCode: this.roomCode,
        state: this.roomState
      });
    }

    // C) Oyunu Başlat Bildirimi
    if (payload.type === 'GAME_START') {
      this.roomState.gameState = 'PLAYING';
      if (payload.players) this.roomState.players = payload.players;
      this.notifyListeners({
        type: 'GAME_START',
        roomCode: this.roomCode,
        players: this.roomState.players
      });
    }
  }

  // Buluta Güncel Durumu Yayınla (Host)
  broadcastStateToCloud(state) {
    const payload = {
      type: 'STATE_UPDATE',
      roomCode: state.code,
      state: state
    };
    this.publishToCloud(state.code, payload);
  }

  // Oyunu Başlat Yayınla (Host)
  startGameBroadcast(players) {
    this.roomState.gameState = 'PLAYING';
    this.roomState.players = players;

    const payload = {
      type: 'GAME_START',
      roomCode: this.roomCode,
      players: players
    };
    this.publishToCloud(this.roomCode, payload);
  }

  // ntfy.sh Üzerinden Yayın Yap
  publishToCloud(code, payload) {
    try {
      fetch(`https://ntfy.sh/defuse_bomb_room_${code}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      }).catch(e => console.warn('ntfy publish error:', e));
    } catch (e) {}
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
