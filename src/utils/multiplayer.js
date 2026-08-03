// %100 KESİN KÜRESEL GERÇEK ZAMANLI ODA VE OYUN İÇİ SENKRONİZASYON MOTORU (NTFY CLOUD RELAY ENGINE)

class RoomManager {
  constructor() {
    this.roomCode = null;
    this.isHost = false;
    this.listeners = new Map();
    this.pollInterval = null;
    this.processedMsgIds = new Set();

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

    // Bulut dinleyicisini 500ms aralıkla başlat
    this.startCloudPolling(code);

    // Odanın kurulduğunu buluta yayınla
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

    // Bulut dinleyicisini başlat
    this.startCloudPolling(cleanCode);

    // 1. Buluttaki geçmiş mesajları tarayıp Oda Kurucusunun yayınladığı oyuncu listesini bul
    const historyMessages = await this.fetchCloudHistory(cleanCode);
    let hostState = null;

    if (historyMessages && historyMessages.length > 0) {
      for (let i = historyMessages.length - 1; i >= 0; i--) {
        const msg = historyMessages[i];
        if (msg && msg.type === 'STATE_UPDATE' && msg.state && msg.state.players) {
          hostState = msg.state;
          break;
        }
      }
    }

    if (hostState && hostState.players && hostState.players.length > 0) {
      const exists = hostState.players.some(p => p.id === playerConfig.id || p.name === playerConfig.name);
      if (!exists) {
        hostState.players.push(playerConfig);
      }
      this.roomState = hostState;
    } else {
      this.roomState = {
        code: cleanCode,
        players: [playerConfig],
        gameState: 'LOBBY',
        inGameState: null
      };
    }

    // Katılım isteğini ve güncel listeyi buluta yayınla (3 defa üst üste garantili gönderim)
    const joinPayload = {
      type: 'JOIN_REQUEST',
      roomCode: cleanCode,
      player: playerConfig,
      state: this.roomState
    };

    const updatePayload = {
      type: 'STATE_UPDATE',
      roomCode: cleanCode,
      state: this.roomState
    };

    await this.publishToCloud(cleanCode, joinPayload);
    await this.publishToCloud(cleanCode, updatePayload);

    setTimeout(() => this.publishToCloud(cleanCode, updatePayload), 600);
    setTimeout(() => this.publishToCloud(cleanCode, updatePayload), 1200);

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

  // 5. KÜRESEL BULUT POLING MOTORU (HER 500MS - %100 MOBİL & PC UYUMLU)
  startCloudPolling(code) {
    if (this.pollInterval) clearInterval(this.pollInterval);

    const pollCloud = async () => {
      if (!this.roomCode) return;
      const messages = await this.fetchCloudHistory(code);

      messages.forEach(msg => {
        if (msg && msg.msgId && !this.processedMsgIds.has(msg.msgId)) {
          this.processedMsgIds.add(msg.msgId);
          this.handleCloudPayload(msg);
        }
      });
    };

    pollCloud();
    this.pollInterval = setInterval(pollCloud, 500);
  }

  // Buluttan Son Mesajları Çekme (ntfy.sh Poll API)
  async fetchCloudHistory(code) {
    const list = [];
    try {
      const res = await fetch(`https://ntfy.sh/defuse_bomb_room_${code}/json?poll=1&since=15m`);
      if (!res.ok) return list;

      const text = await res.text();
      const lines = text.trim().split('\n');

      lines.forEach(line => {
        if (!line) return;
        try {
          const rawObj = JSON.parse(line);
          if (rawObj && rawObj.message) {
            const payload = JSON.parse(rawObj.message);
            payload.msgId = rawObj.id;
            list.push(payload);
          }
        } catch (e) {}
      });
    } catch (e) {
      console.warn('Cloud poll error:', e);
    }
    return list;
  }

  // Buluttan Gelen Mesajları İşle
  handleCloudPayload(payload) {
    if (!payload || payload.roomCode !== this.roomCode) return;

    // A) Katılım İsteği Geldiğinde
    if (payload.type === 'JOIN_REQUEST' && payload.player) {
      const exists = this.roomState.players.some(p => p.id === payload.player.id || p.name === payload.player.name);
      if (!exists) {
        this.roomState.players.push(payload.player);
        if (this.isHost) {
          this.publishToCloud(this.roomCode, {
            type: 'STATE_UPDATE',
            roomCode: this.roomCode,
            state: this.roomState
          });
        }
      }

      this.notifyListeners(this.roomCode, {
        type: 'STATE_UPDATE',
        roomCode: this.roomCode,
        state: this.roomState
      });
    }

    // B) Güncel Oda Durumu
    if (payload.type === 'STATE_UPDATE' && payload.state) {
      if (payload.state.players && payload.state.players.length >= this.roomState.players.length) {
        this.roomState = payload.state;
      } else {
        const combined = [...this.roomState.players];
        payload.state.players.forEach(p => {
          if (!combined.some(c => c.id === p.id || c.name === p.name)) {
            combined.push(p);
          }
        });
        this.roomState.players = combined;
      }

      this.notifyListeners(this.roomCode, {
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
      this.notifyListeners(this.roomCode, {
        type: 'GAME_START',
        roomCode: this.roomCode,
        players: this.roomState.players,
        inGameState: payload.inGameState
      });
    }

    // D) Oyun İçi Canlı Senkronizasyon
    if (payload.type === 'GAME_STATE_UPDATE' && payload.inGameState) {
      this.roomState.inGameState = payload.inGameState;
      this.notifyListeners(this.roomCode, {
        type: 'GAME_STATE_UPDATE',
        roomCode: this.roomCode,
        inGameState: payload.inGameState
      });
    }
  }

  // Buluta Mesaj Gönder (ntfy.sh POST API)
  async publishToCloud(code, payload) {
    try {
      await fetch(`https://ntfy.sh/defuse_bomb_room_${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('Cloud publish error:', e);
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