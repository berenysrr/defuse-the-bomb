// GÜVENİLİR PUBNUB RESMİ SDK MOTORU (OFFICIAL WEBSOCKET ENGINE)

const PUBNUB_SUB_KEY = 'demo';
const PUBNUB_PUB_KEY = 'demo';

class RoomManager {
  constructor() {
    this.roomCode = null;
    this.isHost = false;
    this.listeners = new Map();
    this.myPlayerConfig = null;
    this.pubnub = null;
    this.heartbeatInterval = null;

    this.roomState = {
      code: null,
      hostId: null,
      players: [],
      gameState: 'LOBBY',
      inGameState: null
    };
  }

  initPubNub(uuid) {
    if (this.pubnub) return;

    const PubNubSDK = window.PubNub;
    if (PubNubSDK) {
      this.pubnub = new PubNubSDK({
        publishKey: PUBNUB_PUB_KEY,
        subscribeKey: PUBNUB_SUB_KEY,
        userId: uuid || 'user_' + Math.random().toString(36).substring(2, 8)
      });
    }
  }

  stopStream() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.pubnub && this.roomCode) {
      try {
        this.pubnub.unsubscribe({ channels: [`defuse_bomb_room_${this.roomCode}`] });
      } catch (e) {
        // ignore
      }
    }
  }

  // 1. ODA OLUŞTUR (Host)
  async createRoom(hostPlayerConfig) {
    this.stopStream();

    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.roomCode = code;
    this.isHost = true;
    this.myPlayerConfig = { ...hostPlayerConfig, isHost: true };

    this.roomState = {
      code,
      hostId: this.myPlayerConfig.id,
      players: [this.myPlayerConfig],
      gameState: 'LOBBY',
      inGameState: null
    };

    // PubNub SDK Başlat ve Abone Ol
    this.startPubNubStream(code);

    // Odanın oluşturulduğunu masaya duyur
    await this.publishToCloud(code, {
      type: 'STATE_UPDATE',
      roomCode: code,
      state: this.roomState
    });

    // Host Kalp Atışı: Her 1 saniyede güncel oda durumunu yayınla
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
    this.myPlayerConfig = { ...playerConfig, isHost: false };

    this.roomState = {
      code: cleanCode,
      hostId: null,
      players: [this.myPlayerConfig],
      gameState: 'LOBBY',
      inGameState: null
    };

    // PubNub SDK Başlat ve Abone Ol
    this.startPubNubStream(cleanCode);

    const joinPayload = {
      type: 'JOIN_REQUEST',
      roomCode: cleanCode,
      player: this.myPlayerConfig
    };

    // Anında Katılma İsteği Gönder
    this.publishToCloud(cleanCode, joinPayload);

    // Joiner Yeniden Deneme Döngüsü: Host bizi ekleyene kadar her 1s'de istek gönder
    this.heartbeatInterval = setInterval(() => {
      if (!this.isHost && this.roomCode === cleanCode) {
        const isMeInRoom = this.roomState.players.some(
          p => p.id === this.myPlayerConfig.id || (p.name && p.name.trim().toLowerCase() === this.myPlayerConfig.name.trim().toLowerCase())
        );
        if (!isMeInRoom) {
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

  // 5. RESMİ PUBNUB CANLI AKIŞ MOTORU (WEBSOCKETS + AUTO RECONNECT)
  startPubNubStream(code) {
    const uuid = this.myPlayerConfig ? this.myPlayerConfig.id : 'user_' + Math.random().toString(36).substring(2, 8);
    this.initPubNub(uuid);

    const channel = `defuse_bomb_room_${code}`;

    if (this.pubnub) {
      this.pubnub.removeAllListeners();
      this.pubnub.addListener({
        message: (evt) => {
          if (evt && evt.message) {
            this.handleCloudPayload(evt.message);
          }
        }
      });
      this.pubnub.subscribe({ channels: [channel] });
    } else {
      // Fallback
      this.startFallbackStream(code);
    }
  }

  // REST Fallback (İkincil Yedek Akış)
  startFallbackStream(code) {
    const channel = `defuse_bomb_room_${code}`;
    let timetoken = '0';

    const poll = async () => {
      if (this.roomCode !== code) return;
      try {
        const res = await fetch(`https://ps.pubnub.com/subscribe/${PUBNUB_SUB_KEY}/${channel}/0/${timetoken}`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data[0])) {
            if (data[1]) timetoken = data[1];
            data[0].forEach(msg => this.handleCloudPayload(msg));
          }
        }
      } catch (e) {
        // ignore
      }
      if (this.roomCode === code) {
        setTimeout(poll, 600);
      }
    };
    poll();
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

      // Güncellenmiş oyuncu listesini yayınla
      const statePayload = {
        type: 'STATE_UPDATE',
        roomCode: this.roomCode,
        state: this.roomState
      };

      this.publishToCloud(this.roomCode, statePayload);
      this.notifyListeners(this.roomCode, statePayload);
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

  // PubNub Üzerinden Yayın Yap
  async publishToCloud(code, payload) {
    try {
      const channel = `defuse_bomb_room_${code}`;
      if (this.pubnub) {
        await this.pubnub.publish({
          channel: channel,
          message: payload
        });
      } else {
        // Fallback POST
        await fetch(`https://ps.pubnub.com/publish/${PUBNUB_PUB_KEY}/${PUBNUB_SUB_KEY}/0/${channel}/0`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
    } catch (e) {
      console.warn('PubNub pub error:', e);
    }
  }

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
