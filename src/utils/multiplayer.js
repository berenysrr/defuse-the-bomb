// %100 GERÇEK ZAMANLI KÜRESEL ODA VE OYUN İÇİ SENKRONİZASYON MOTORU

class RoomManager {
  constructor() {
    this.roomCode = null;
    this.isHost = false;
    this.listeners = [];
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

    // Bulut polling başlat
    this.startCloudPolling(code);

    // Odanın kurulduğunu yayınla
    await this.publishToCloud(code, {
      type: 'STATE_UPDATE',
      roomCode: code,
      state: this.roomState
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

    // Bulut polling başlat
    this.startCloudPolling(cleanCode);

    // Bulut geçmişini tara
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
      const combined = [...hostState.players];
      const exists = combined.some(p => p.id === playerConfig.id || p.name === playerConfig.name);
      if (!exists) {
        combined.push(playerConfig);
      }
      this.roomState = {
        ...hostState,
        players: combined
      };
    } else {
      this.roomState = {
        code: cleanCode,
        players: [playerConfig],
        gameState: 'LOBBY',
        inGameState: null
      };
    }

    const updatePayload = {
      type: 'STATE_UPDATE',
      roomCode: cleanCode,
      state: this.roomState
    };

    // Buluta yeni durumu yayınla
    await this.publishToCloud(cleanCode, updatePayload);
    setTimeout(() => this.publishToCloud(cleanCode, updatePayload), 500);

    this.notifyListeners(updatePayload);
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

    await this.publishToCloud(this.roomCode, payload);
    this.notifyListeners(payload);
  }

  // 5. BULUT SORGULAMA MOTORU (HER 400MS)
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
    this.pollInterval = setInterval(pollCloud, 400);
  }

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
    } catch (e) {}
    return list;
  }

  handleCloudPayload(payload) {
    if (!payload || payload.roomCode !== this.roomCode) return;

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

      this.notifyListeners({
        type: 'STATE_UPDATE',
        roomCode: this.roomCode,
        state: this.roomState
      });
    }

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

    if (payload.type === 'GAME_STATE_UPDATE' && payload.inGameState) {
      this.roomState.inGameState = payload.inGameState;
      this.notifyListeners({
        type: 'GAME_STATE_UPDATE',
        roomCode: this.roomCode,
        inGameState: payload.inGameState
      });
    }
  }

  async publishToCloud(code, payload) {
    try {
      await fetch(`https://ntfy.sh/defuse_bomb_room_${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
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