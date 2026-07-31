// GÜVENİLİR PUBNUB ÇİFT MOTORLU (WEBSOCKET + HTTP POST REST) KÜRESEL CANLI AKIŞ SİSTEMİ

const PUBNUB_SUB_KEY = 'demo';
const PUBNUB_PUB_KEY = 'demo';

class RoomManager {
  constructor() {
    this.roomCode = null;
    this.isHost = false;
    this.listeners = new Map();
    this.pubnub = null;
    this.heartbeatInterval = null;
    this.myPlayerConfig = null;
    this.pollInterval = null;
    this.lastTimeToken = '0';

    this.roomState = {
      code: null,
      hostId: null,
      players: [],
      gameState: 'LOBBY',
      inGameState: null
    };
  }

  getPubNubInstance() {
    if (this.pubnub) return this.pubnub;

    const PubNubClass = window.PubNub;
    if (PubNubClass) {
      try {
        this.pubnub = new PubNubClass({
          publishKey: PUBNUB_PUB_KEY,
          subscribeKey: PUBNUB_SUB_KEY,
          userId: 'user_' + Math.random().toString(36).substring(2, 9),
          ssl: true
        });
      } catch (e) {
        console.warn('PubNub init error:', e);
      }
    }
    return this.pubnub;
  }

  stopStream() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    const pb = this.getPubNubInstance();
    if (pb && this.roomCode) {
      try {
        pb.unsubscribe({ channels: [`defuse_bomb_room_${this.roomCode}`] });
      } catch (e) {
        // ignore
      }
    }
  }

  startStream(code) {
    this.stopStream();
    this.roomCode = code;

    const channel = `defuse_bomb_room_${code}`;

    // 1. PubNub WebSocket Dinleyici
    const pb = this.getPubNubInstance();
    if (pb) {
      try {
        pb.removeAllListeners();
        pb.addListener({
          message: (evt) => {
            if (evt && evt.message) {
              this.handleCloudPayload(evt.message);
            }
          }
        });
        pb.subscribe({ channels: [channel] });
      } catch (e) {
        console.warn('PubNub SDK subscribe error:', e);
      }
    }

    // 2. HTTP Polling Yedek Dinleyici (Soket Tıkanmasına Karşı 1.5s Güvenlik Ağı)
    const pollFallback = async () => {
      if (this.roomCode !== code) return;
      try {
        const url = `https://ps.pubnub.com/subscribe/${PUBNUB_SUB_KEY}/${channel}/0/${this.lastTimeToken}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data[0]) && data[0].length > 0) {
            this.lastTimeToken = data[1] || this.lastTimeToken;
            data[0].forEach(msg => this.handleCloudPayload(msg));
          }
        }
      } catch (e) {
        // ignore
      }
    };

    this.pollInterval = setInterval(pollFallback, 1500);
  }

  // 1. ODA OLUŞTUR (Host)
  async createRoom(hostPlayerConfig) {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.isHost = true;
    this.myPlayerConfig = { ...hostPlayerConfig, isHost: true };

    this.roomState = {
      code,
      hostId: this.myPlayerConfig.id,
      players: [this.myPlayerConfig],
      gameState: 'LOBBY',
      inGameState: null
    };

    this.startStream(code);

    // Initial broadcast
    this.publishToCloud(code, {
      type: 'STATE_UPDATE',
      roomCode: code,
      state: {
        ...this.roomState,
        players: [...this.roomState.players]
      }
    });

    // Host Kalp Atışı: Her 1 saniyede oda durumunu yayınla
    this.heartbeatInterval = setInterval(() => {
      if (this.isHost && this.roomCode === code) {
        this.publishToCloud(code, {
          type: 'STATE_UPDATE',
          roomCode: code,
          state: {
            ...this.roomState,
            players: [...this.roomState.players]
          }
        });
      }
    }, 1000);

    return code;
  }

  // 2. ODAYA KATIL (Joiner)
  async joinRoom(code, playerConfig) {
    const cleanCode = code.trim().toUpperCase();
    this.isHost = false;
    this.myPlayerConfig = { ...playerConfig, isHost: false };

    this.roomState = {
      code: cleanCode,
      hostId: null,
      players: [this.myPlayerConfig],
      gameState: 'LOBBY',
      inGameState: null
    };

    this.startStream(cleanCode);

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
          p => p.id === this.myPlayerConfig.id
        );
        if (!isMeInRoom) {
          this.publishToCloud(cleanCode, joinPayload);
        }
      }
    }, 1000);

    return {
      ...this.roomState,
      players: [...this.roomState.players]
    };
  }

  // 3. OYUNU BAŞLAT (Host)
  async startGameBroadcast(players, initialInGameState = null) {
    if (!this.roomCode) return;

    this.roomState.gameState = 'PLAYING';
    this.roomState.players = [...players];
    if (initialInGameState) {
      this.roomState.inGameState = initialInGameState;
    }

    const payload = {
      type: 'GAME_START',
      roomCode: this.roomCode,
      players: [...players],
      inGameState: initialInGameState
    };

    this.publishToCloud(this.roomCode, payload);
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

    this.publishToCloud(this.roomCode, payload);
    this.notifyListeners(this.roomCode, payload);
  }

  // Buluttan Gelen Mesajları İşle
  handleCloudPayload(payload) {
    if (!payload || payload.roomCode !== this.roomCode) return;

    // A) Host: Katılma İsteğini İşler
    if (payload.type === 'JOIN_REQUEST' && payload.player && this.isHost) {
      const exists = this.roomState.players.some(
        p => p.id === payload.player.id
      );

      let playerToAdd = payload.player;
      if (!exists) {
        const sameNameCount = this.roomState.players.filter(
          p => p.name && p.name.trim().toLowerCase().startsWith(payload.player.name.trim().toLowerCase())
        ).length;

        if (sameNameCount > 0) {
          playerToAdd = {
            ...payload.player,
            name: `${payload.player.name} (${sameNameCount + 1})`
          };
        }

        this.roomState.players = [...this.roomState.players, playerToAdd];
      }

      const statePayload = {
        type: 'STATE_UPDATE',
        roomCode: this.roomCode,
        state: {
          ...this.roomState,
          players: [...this.roomState.players]
        }
      };

      this.publishToCloud(this.roomCode, statePayload);
      this.notifyListeners(this.roomCode, statePayload);
    }

    // B) Katılımcılar & Host: Güncel Oda Durumu
    if (payload.type === 'STATE_UPDATE' && payload.state) {
      if (payload.state.players && payload.state.players.length > 0) {
        if (this.isHost) {
          const currentHostIds = new Set(this.roomState.players.map(p => p.id));
          let changed = false;
          const newPlayers = [...this.roomState.players];

          payload.state.players.forEach(p => {
            if (!currentHostIds.has(p.id)) {
              newPlayers.push(p);
              changed = true;
            }
          });

          if (changed) {
            this.roomState.players = newPlayers;
          }
        } else {
          this.roomState = {
            ...payload.state,
            players: [...payload.state.players]
          };
        }

        this.notifyListeners(this.roomCode, {
          type: 'STATE_UPDATE',
          roomCode: this.roomCode,
          state: {
            ...this.roomState,
            players: [...this.roomState.players]
          }
        });
      }
    }

    // C) Oyunu Başlat Bildirimi
    if (payload.type === 'GAME_START') {
      this.roomState.gameState = 'PLAYING';
      if (payload.players && payload.players.length > 0) {
        this.roomState.players = [...payload.players];
      }
      this.notifyListeners(this.roomCode, {
        type: 'GAME_START',
        roomCode: this.roomCode,
        players: [...this.roomState.players],
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

  // PubNub Üzerinden Yayın Yap (Çift Motorlu: WebSocket + HTTP POST REST)
  async publishToCloud(code, payload) {
    if (!code || !payload) return;
    const channel = `defuse_bomb_room_${code}`;

    // 1. PubNub SDK (WebSocket)
    const pb = this.getPubNubInstance();
    if (pb) {
      try {
        pb.publish({ channel: channel, message: payload });
      } catch (e) {}
    }

    // 2. PubNub REST API (HTTP POST - Çifte Güvenlik)
    try {
      const url = `https://ps.pubnub.com/publish/${PUBNUB_PUB_KEY}/${PUBNUB_SUB_KEY}/0/${channel}/0`;
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (e) {}
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