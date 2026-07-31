// GÜVENİLİR KÜRESEL GERÇEK ZAMANLI PUBSUB MOTORU (PUBNUB GLOBAL REALTIME API)

const PUBNUB_SUB_KEY = 'demo';
const PUBNUB_PUB_KEY = 'demo';

class RoomManager {
  constructor() {
    this.roomCode = null;
    this.isHost = false;
    this.listeners = new Map();
    this.pollInterval = null;
    this.lastTimeToken = '0';

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

    this.roomState = {
      code,
      hostId: hostPlayerConfig.id,
      players: [hostPlayerConfig],
      gameState: 'LOBBY',
      inGameState: null
    };

    // PubNub canlı kanalını dinlemeye başla
    this.startPubNubStream(code);

    // Odanın oluşturulduğunu buluta duyur
    await this.publishToCloud(code, {
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

    this.roomState = {
      code: cleanCode,
      players: [playerConfig],
      gameState: 'LOBBY',
      inGameState: null
    };

    // PubNub canlı kanalını dinlemeye başla
    this.startPubNubStream(cleanCode);

    // Host'a Katılım İsteği Yayınla (3 defa üst üste garantili gönderim)
    const joinPayload = {
      type: 'JOIN_REQUEST',
      roomCode: cleanCode,
      player: playerConfig
    };

    this.publishToCloud(cleanCode, joinPayload);
    setTimeout(() => this.publishToCloud(cleanCode, joinPayload), 500);
    setTimeout(() => this.publishToCloud(cleanCode, joinPayload), 1200);

    return this.roomState;
  }

  // 3. OYUNU BAŞLAT (Host)
  async startGameBroadcast(players, initialInGameState = null) {
    if (!this.roomCode) return;

    this.roomState.gameState = 'PLAYING';
    this.roomState.players = players;
    if (initialInGameState) {
      this.roomState.inGameState = initialInGameState;
    }

    const payload = {
      type: 'GAME_START',
      roomCode: this.roomCode,
      players: players,
      inGameState: initialInGameState
    };

    await this.publishToCloud(this.roomCode, payload);

    this.notifyListeners(this.roomCode, payload);
  }

  // 4. OYUN İÇİ GERÇEK ZAMANLI DURUM YAYINLAMA (Kablo kesme, kart atma, soru cevaplama)
  async broadcastInGameState(inGameStatePayload) {
    if (!this.roomCode) return;

    this.roomState.inGameState = inGameStatePayload;

    const payload = {
      type: 'GAME_STATE_UPDATE',
      roomCode: this.roomCode,
      inGameState: inGameStatePayload
    };

    await this.publishToCloud(this.roomCode, payload);

    this.notifyListeners(this.roomCode, payload);
  }

  // 5. PUBNUB CANLI AKIŞ MOTORU (KÜRESEL GERÇEK ZAMANLI MESAJ DİNLEYİCİSİ)
  startPubNubStream(code) {
    if (this.pollInterval) clearInterval(this.pollInterval);

    const channel = `defuse_bomb_room_${code}`;

    const pollPubNub = async () => {
      if (!this.roomCode) return;
      try {
        const url = `https://ps.pubnub.com/subscribe/${PUBNUB_SUB_KEY}/${channel}/0/${this.lastTimeToken}`;
        const res = await fetch(url);
        if (!res.ok) return;

        const data = await res.json();
        if (data && Array.isArray(data[0]) && data[0].length > 0) {
          this.lastTimeToken = data[1] || this.lastTimeToken;

          data[0].forEach(msg => {
            this.handleCloudPayload(msg);
          });
        }
      } catch (e) {
        console.warn('PubNub sub error:', e);
      }
    };

    // Anında dinle ve her 400ms'de bir mesajları çek
    pollPubNub();
    this.pollInterval = setInterval(pollPubNub, 400);
  }

  // Buluttan Gelen Mesajları İşle
  handleCloudPayload(payload) {
    if (!payload || payload.roomCode !== this.roomCode) return;

    // A) Oda Kurucusu (Host) Katılan Oyuncuyu Ekler ve Yeni Durumu Yayınlar
    if (payload.type === 'JOIN_REQUEST' && payload.player && this.isHost) {
      const exists = this.roomState.players.some(p => p.id === payload.player.id || p.name === payload.player.name);
      if (!exists) {
        this.roomState.players.push(payload.player);
        
        // Güncel oyuncu listesini tüm masaya yayınla
        this.publishToCloud(this.roomCode, {
          type: 'STATE_UPDATE',
          roomCode: this.roomCode,
          state: this.roomState
        });
      }
    }

    // B) Güncel Oda Durumu (Tüm Katılımcılar Oyuncu Listesini Günceller)
    if (payload.type === 'STATE_UPDATE' && payload.state) {
      if (payload.state.players && payload.state.players.length > 0) {
        this.roomState = payload.state;
        this.notifyListeners(this.roomCode, {
          type: 'STATE_UPDATE',
          roomCode: this.roomCode,
          state: this.roomState
        });
      }
    }

    // C) Oyunu Başlat Bildirimi
    if (payload.type === 'GAME_START') {
      this.roomState.gameState = 'PLAYING';
      if (payload.players && payload.players.length > 0) {
        this.roomState.players = payload.players;
      }
      this.notifyListeners(this.roomCode, {
        type: 'GAME_START',
        roomCode: this.roomCode,
        players: this.roomState.players,
        inGameState: payload.inGameState
      });
    }

    // D) Oyun İçi Canlı Senkronizasyon (Kablo, Kart, Sıra, Puan)
    if (payload.type === 'GAME_STATE_UPDATE' && payload.inGameState) {
      this.roomState.inGameState = payload.inGameState;
      this.notifyListeners(this.roomCode, {
        type: 'GAME_STATE_UPDATE',
        roomCode: this.roomCode,
        inGameState: payload.inGameState
      });
    }
  }

  // PubNub Üzerinden Küresel Yayın Yap
  async publishToCloud(code, payload) {
    try {
      const channel = `defuse_bomb_room_${code}`;
      const msgStr = encodeURIComponent(JSON.stringify(payload));
      const url = `https://ps.pubnub.com/publish/${PUBNUB_PUB_KEY}/${PUBNUB_SUB_KEY}/0/${channel}/0/${msgStr}`;
      await fetch(url);
    } catch (e) {
      console.warn('PubNub pub error:', e);
    }
  }

  // Oda koduna özel dinleyici
  subscribe(roomCode, callback) {
    let targetCode = roomCode;
    let cb = callback;

    if (typeof roomCode === 'function') {
      cb = roomCode;
      targetCode = this.roomCode || 'GLOBAL';
    }

    if (!this.listeners.has(targetCode)) {
      this.listeners.set(targetCode, []);
    }
    this.listeners.get(targetCode).push(cb);

    return () => {
      const list = this.listeners.get(targetCode);
      if (list) {
        this.listeners.set(targetCode, list.filter(l => l !== cb));
      }
    };
  }

  notifyListeners(code, data) {
    const list = this.listeners.get(code);
    if (list) {
      list.forEach(cb => cb(data));
    }
    const globalList = this.listeners.get('GLOBAL');
    if (globalList) {
      globalList.forEach(cb => cb(data));
    }
  }
}

export const roomManager = new RoomManager();
