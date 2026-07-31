// GÜVENİLİR KÜRESEL İNTERNET ODA SENKRONİZASYON MOTORU (NTFY.SH REAL-TIME PUBSUB + SINCE HISTORY)

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

    // Küresel Canlı PubSub Kanalına Abone Ol (Geçmiş 10dk mesajları dahil)
    this.subscribeToGlobalChannel(code);

    // Oda Kuruldu Yayın Yap
    setTimeout(() => {
      this.broadcastStateToCloud(this.roomState);
    }, 300);

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

    // Katılma isteğini 3 defa tekrarla (Garantili Yayın)
    const sendJoinReq = () => {
      const joinPayload = {
        type: 'JOIN_REQUEST',
        roomCode: cleanCode,
        player: playerConfig
      };
      this.publishToCloud(cleanCode, joinPayload);
    };

    sendJoinReq();
    setTimeout(sendJoinReq, 600);
    setTimeout(sendJoinReq, 1500);

    return this.roomState;
  }

  // 3. KÜRESEL PUBSUB KANALINA CANLI ABONE OL (NTFY.SH REAL-TIME SSE)
  subscribeToGlobalChannel(code) {
    if (this.eventSource) {
      this.eventSource.close();
    }

    // `since=10m` ekleyerek geçmiş 10 dakikadaki tüm oda mesajlarını anında çeker!
    const channelUrl = `https://ntfy.sh/defuse_bomb_room_${code}/json?since=10m`;
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
      // Eğer daha güncel bir oyuncu listesi geldiyse güncelle
      if (payload.state.players && payload.state.players.length >= this.roomState.players.length) {
        this.roomState = payload.state;
      } else {
        // Yeni katılan kendi oyuncusunu kaybetmemek için birleştir
        const combined = [...this.roomState.players];
        payload.state.players.forEach(p => {
          if (!combined.some(c => c.id === p.id || c.name === p.name)) {
            combined.push(p);
          }
        });
        this.roomState.players = combined;
      }

      this.notifyListeners({
        type: 'STATE_UPDATE',
        roomCode: this.roomCode,
        state: this.roomState
      });
    }

    // C) Oyunu Başlat Bildirimi
    if (payload.type === 'GAME_START') {
      this.roomState.gameState = 'PLAYING';
      if (payload.players && payload.players.length > 0) {
        this.roomState.players = payload.players;
      }
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
        headers: { 'Content-Type': 'text/plain' },
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
