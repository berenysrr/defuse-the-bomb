// GÜVENİLİR KÜRESEL GERÇEK ZAMANLI PUBSUB MOTORU (PUBNUB GLOBAL REALTIME API)

const PUBNUB_SUB_KEY = 'demo';
const PUBNUB_PUB_KEY = 'demo';

class RoomManager {
  constructor() {
    this.roomCode = null;
    this.isHost = false;
    this.listeners = new Map();
    this.isStreaming = false;
    this.abortController = null;
    this.heartbeatInterval = null;
    this.myPlayerId = null;

    this.roomState = {
      code: null,
      hostId: null,
      players: [],
      gameState: 'LOBBY',
      inGameState: null
    };
  }

  stopStream() {
    this.isStreaming = false;
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch (e) {
        // ignore
      }
      this.abortController = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 1. ODA OLUŞTUR (Host)
  async createRoom(hostPlayerConfig) {
    this.stopStream();

    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.roomCode = code;
    this.isHost = true;
    this.myPlayerId = hostPlayerConfig.id;

    const hostPlayer = {
      ...hostPlayerConfig,
      isHost: true
    };

    this.roomState = {
      code,
      hostId: hostPlayer.id,
      players: [hostPlayer],
      gameState: 'LOBBY',
      inGameState: null
    };

    // PubNub canlı akışını başlat
    this.startPubNubStream(code);

    // Odanın oluşturulduğunu buluta duyur
    await this.publishToCloud(code, {
      type: 'STATE_UPDATE',
      roomCode: code,
      state: this.roomState
    });

    // Host Kalp Atışı: Her 1 saniyede oda durumunu yayınla
    this.heartbeatInterval = setInterval(() => {
      if (this.isHost && this.roomCode === code) {
        this.publishToCloud(code, {
          type: 'STATE_UPDATE',
          roomCode: code,
          state: this.roomState
        });
      }
    }, 1000);

    return code;
  }

  // 2. ODAYA KATIL (Joiner)
  async joinRoom(code, playerConfig) {
    this.stopStream();

    const cleanCode = code.trim().toUpperCase();
    this.roomCode = cleanCode;
    this.isHost = false;
    this.myPlayerId = playerConfig.id;

    const joinerPlayer = {
      ...playerConfig,
      isHost: false
    };

    this.roomState = {
      code: cleanCode,
      hostId: null,
      players: [joinerPlayer],
      gameState: 'LOBBY',
      inGameState: null
    };

    // PubNub canlı akışını başlat
    this.startPubNubStream(cleanCode);

    const joinPayload = {
      type: 'JOIN_REQUEST',
      roomCode: cleanCode,
      player: joinerPlayer
    };

    // Anında gönder
    this.publishToCloud(cleanCode, joinPayload);

    // Joiner Yeniden Deneme Döngüsü: Host'un oyuncu listesinde Host görünene kadar her 1s'de istek at
    this.heartbeatInterval = setInterval(() => {
      if (!this.isHost && this.roomCode === cleanCode) {
        const hasHost = this.roomState.players.some(p => p.isHost);
        if (!hasHost) {
          this.publishToCloud(cleanCode, joinPayload);
        }
      }
    }, 1000);

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

  // 4. OYUN İÇİ GERÇEK ZAMANLI DURUM YAYINLAMA
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

  // 5. TEK SOKETLİ SIRALI AKIŞ MOTORU
  async startPubNubStream(code) {
    this.isStreaming = true;
    const channel = `defuse_bomb_room_${code}`;
    let timetoken = '0';

    while (this.isStreaming && this.roomCode === code) {
      try {
        this.abortController = new AbortController();
        const timeoutId = setTimeout(() => {
          if (this.abortController) this.abortController.abort();
        }, 12000);

        const url = `https://ps.pubnub.com/subscribe/${PUBNUB_SUB_KEY}/${channel}/0/${timetoken}`;
        const res = await fetch(url, { signal: this.abortController.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data[0])) {
            if (data[1]) {
              timetoken = data[1];
            }
            data[0].forEach(msg => {
              this.handleCloudPayload(msg);
            });
          }
        }
      } catch (e) {
        await new Promise(r => setTimeout(r, 600));
      }
      await new Promise(r => setTimeout(r, 100));
    }
  }

  // Buluttan Gelen Mesajları İşle
  handleCloudPayload(payload) {
    if (!payload || payload.roomCode !== this.roomCode) return;

    // A) Host: Katılma İsteğini İşler
    if (payload.type === 'JOIN_REQUEST' && payload.player && this.isHost) {
      const exists = this.roomState.players.some(
        p => p.id === payload.player.id || (p.name && p.name.trim().toLowerCase() === payload.player.name.trim().toLowerCase())
      );
      if (!exists) {
        this.roomState.players.push(payload.player);
      }

      // Güncellenmiş listeyi masaya hemen yayınla
      this.publishToCloud(this.roomCode, {
        type: 'STATE_UPDATE',
        roomCode: this.roomCode,
        state: this.roomState
      });

      this.notifyListeners(this.roomCode, {
        type: 'STATE_UPDATE',
        roomCode: this.roomCode,
        state: this.roomState
      });
    }

    // B) Katılımcılar & Host: Güncel Oda Durumu
    if (payload.type === 'STATE_UPDATE' && payload.state) {
      if (payload.state.players && payload.state.players.length > 0) {
        if (this.isHost) {
          const currentHostIds = new Set(this.roomState.players.map(p => p.id));
          payload.state.players.forEach(p => {
            if (!currentHostIds.has(p.id)) {
              this.roomState.players.push(p);
            }
          });
        } else {
          this.roomState = payload.state;
        }

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

    // D) Oyun İçi Senkronizasyon
    if (payload.type === 'GAME_STATE_UPDATE' && payload.inGameState) {
      this.roomState.inGameState = payload.inGameState;
      this.notifyListeners(this.roomCode, {
        type: 'GAME_STATE_UPDATE',
        roomCode: this.roomCode,
        inGameState: payload.inGameState
      });
    }
  }

  // PubNub POST Yöntemi ile Yayın Yap (Paket boyutu ve mobil proxy sınırlaması kalmaz)
  async publishToCloud(code, payload) {
    try {
      const channel = `defuse_bomb_room_${code}`;
      const url = `https://ps.pubnub.com/publish/${PUBNUB_PUB_KEY}/${PUBNUB_SUB_KEY}/0/${channel}/0`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
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
