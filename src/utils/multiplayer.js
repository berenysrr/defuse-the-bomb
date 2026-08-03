// 🚀 GERÇEK ZAMANLI KÜRESEL MULTIPLAYER ODA MOTORU (EVENTSOURCE SSE)

class RoomManager {
  constructor() {
    this.roomCode = null;
    this.isHost = false;
    this.listeners = [];
    this.processedMsgIds = new Set();
    this.eventSource = null;
    this.reconnectTimer = null;

    this.roomState = {
      code: null,
      players: [],
      gameState: 'LOBBY',
      inGameState: null
    };
  }

  // SSE (Server-Sent Events) Bağlantısı Başlat
  connectSSE(code) {
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch (e) {}
      this.eventSource = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const sseUrl = `https://ntfy.sh/defuse_bomb_room_${code}/sse?since=15m`;
    
    try {
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onmessage = (event) => {
        if (!event || !event.data) return;
        try {
          const rawObj = JSON.parse(event.data);
          if (rawObj && rawObj.event === 'message' && rawObj.message) {
            const payload = JSON.parse(rawObj.message);
            const msgId = rawObj.id || Math.random().toString();
            
            if (!this.processedMsgIds.has(msgId)) {
              this.processedMsgIds.add(msgId);
              this.handleCloudPayload(payload);
            }
          }
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      };

      this.eventSource.onerror = (err) => {
        console.warn("SSE connection interrupted, auto reconnecting...", err);
        if (this.eventSource) {
          try { this.eventSource.close(); } catch (e) {}
          this.eventSource = null;
        }
        // 2 saniye sonra otomatik yeniden bağlan
        this.reconnectTimer = setTimeout(() => {
          if (this.roomCode === code) {
            this.connectSSE(code);
          }
        }, 2000);
      };
    } catch (e) {
      console.error("Failed to establish SSE connection:", e);
    }
  }

  // 1. ODA OLUŞTUR (Host)
  async createRoom(hostPlayerConfig) {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.roomCode = code;
    this.isHost = true;

    const hostObj = { ...hostPlayerConfig, isHost: true };

    this.roomState = {
      code,
      hostId: hostObj.id,
      players: [hostObj],
      gameState: 'LOBBY',
      inGameState: null
    };

    // SSE Dinleyicisini Başlat
    this.connectSSE(code);

    // Buluta odayı yayınla
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

    const joinerObj = { ...playerConfig, isHost: false };

    this.roomState = {
      code: cleanCode,
      players: [joinerObj],
      gameState: 'LOBBY',
      inGameState: null
    };

    // SSE Dinleyicisini Başlat (Son 15 dk geçmiş mesajları anında çeker)
    this.connectSSE(cleanCode);

    // Katılım Talebini Gönder
    await this.publishToCloud(cleanCode, {
      type: 'JOIN_REQUEST',
      roomCode: cleanCode,
      player: joinerObj
    });

    // Oda Kurucusundan Güncel Durumu İste
    await this.publishToCloud(cleanCode, {
      type: 'REQUEST_STATE',
      roomCode: cleanCode
    });

    this.notifyListeners({
      type: 'STATE_UPDATE',
      roomCode: cleanCode,
      state: this.roomState
    });

    return this.roomState;
  }

  // Oyuncu listelerini akıllıca birleştirme (Deduplication & Order)
  mergePlayerLists(listA = [], listB = []) {
    const merged = [...listA];

    listB.forEach(item => {
      if (!item) return;
      const exists = merged.some(p => String(p.id) === String(item.id) || p.name === item.name);
      if (!exists) {
        merged.push(item);
      } else {
        // Varsa bilgilerini güncelle (avatar, isHost vb)
        const idx = merged.findIndex(p => String(p.id) === String(item.id) || p.name === item.name);
        if (idx !== -1) {
          merged[idx] = { ...merged[idx], ...item };
        }
      }
    });

    // Kurucuyu (isHost: true) her zaman listenin en başına (index 0) yerleştir
    merged.sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0));
    return merged;
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

  handleCloudPayload(payload) {
    if (!payload || payload.roomCode !== this.roomCode) return;

    // A) Yeni Katılan Oyuncu Geldiğinde Listeyi Birleştir
    if (payload.type === 'JOIN_REQUEST' && payload.player) {
      const mergedPlayers = this.mergePlayerLists(this.roomState.players, [payload.player]);
      this.roomState.players = mergedPlayers;

      if (this.isHost) {
        this.publishToCloud(this.roomCode, {
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

    // B) Durum Talebi Geldiğinde (Katılan biri istek attığında Host yanıt verir)
    if (payload.type === 'REQUEST_STATE' && this.isHost) {
      this.publishToCloud(this.roomCode, {
        type: 'STATE_UPDATE',
        roomCode: this.roomCode,
        state: this.roomState
      });
    }

    // C) Güncel Oda Durumu Geldiğinde Oyuncuları Birleştir
    if (payload.type === 'STATE_UPDATE' && payload.state && Array.isArray(payload.state.players)) {
      const mergedPlayers = this.mergePlayerLists(this.roomState.players, payload.state.players);
      this.roomState = {
        ...payload.state,
        players: mergedPlayers
      };

      this.notifyListeners({
        type: 'STATE_UPDATE',
        roomCode: this.roomCode,
        state: this.roomState
      });
    }

    // D) Oyunu Başlat Bildirimi
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

    // E) Oyun İçi Canlı Senkronizasyon
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
    } catch (e) {
      console.error("Cloud publish error:", e);
    }
  }

  subscribe(roomCodeOrCb, callback) {
    const cb = typeof roomCodeOrCb === 'function' ? roomCodeOrCb : callback;
    if (typeof cb !== 'function') return () => {};

    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  notifyListeners(data) {
    this.listeners.forEach(cb => {
      if (typeof cb === 'function') {
        try {
          cb(data);
        } catch (e) {
          console.error("Error in room listener callback:", e);
        }
      }
    });
  }
}

export const roomManager = new RoomManager();