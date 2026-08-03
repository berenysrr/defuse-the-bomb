// 🚀 GERÇEK ZAMANLI KÜRESEL MULTIPLAYER ODA MOTORU (EVENTSOURCE SSE + NON-BLOCKING HANDSHAKE)

class RoomManager {
  constructor() {
    this.roomCode = null;
    this.isHost = false;
    this.myPlayer = null;
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

  // SSE (Server-Sent Events) Kalıcı Bağlantı Motoru (0ms Gecikme, 0 HTTP Kısıtlaması)
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

      this.eventSource.onerror = () => {
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

  // 1. ODA OLUŞTUR (Host - Anında 0ms Tepki)
  createRoom(hostPlayerConfig) {
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

    // SSE Dinleyicisini Başlat
    this.connectSSE(code);

    // Buluta odayı arka planda yayınla (UI'ı asla kitlemez)
    this.publishToCloud(code, {
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

  // 2. ODAYA KATIL (Joiner - Anında 0ms Tepki)
  joinRoom(code, playerConfig) {
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

    // SSE Dinleyicisini Başlat
    this.connectSSE(cleanCode);

    // Arka Planda Katılım El Sıkışması (Handshake)
    const sendHandshake = () => {
      this.publishToCloud(cleanCode, {
        type: 'JOIN_REQUEST',
        roomCode: cleanCode,
        player: joinerObj
      });

      this.publishToCloud(cleanCode, {
        type: 'REQUEST_STATE',
        roomCode: cleanCode
      });
    };

    sendHandshake();
    setTimeout(sendHandshake, 400);
    setTimeout(sendHandshake, 1200);

    this.notifyListeners({
      type: 'STATE_UPDATE',
      roomCode: cleanCode,
      state: this.roomState
    });

    return this.roomState;
  }

  // Sadece Benzersiz ID İle Oyuncu Birleştirme + Kendi Oyuncunu Daima Koru (myPlayer)
  mergePlayerLists(listA = [], listB = []) {
    const merged = [];

    const addPlayer = (item) => {
      if (!item || !item.id) return;
      const idx = merged.findIndex(p => String(p.id) === String(item.id));
      if (idx === -1) {
        merged.push({ ...item });
      } else {
        merged[idx] = { ...merged[idx], ...item };
      }
    };

    listA.forEach(addPlayer);
    listB.forEach(addPlayer);

    // Kendi Oyuncunu Daima Koru (this.myPlayer)
    if (this.myPlayer && !merged.some(p => String(p.id) === String(this.myPlayer.id))) {
      merged.push(this.myPlayer);
    }

    // Kurucuyu (isHost: true) her zaman listenin en başına (index 0) yerleştir
    merged.sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0));
    return merged;
  }

  // 3. OYUNU BAŞLAT (Host)
  startGameBroadcast(players, initialInGameState = null) {
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

    this.publishToCloud(this.roomCode, payload);
    this.notifyListeners(payload);
  }

  // 4. OYUN İÇİ CANLI YAYIN
  broadcastInGameState(inGameStatePayload) {
    if (!this.roomCode) return;

    this.roomState.inGameState = inGameStatePayload;

    const payload = {
      type: 'GAME_STATE_UPDATE',
      roomCode: this.roomCode,
      inGameState: inGameStatePayload
    };

    this.publishToCloud(this.roomCode, payload);
    this.notifyListeners(payload);
  }

  handleCloudPayload(payload) {
    if (!payload || payload.roomCode !== this.roomCode) return;

    // A) Yeni Katılan Oyuncu Geldiğinde Listeyi Birleştir
    if (payload.type === 'JOIN_REQUEST' && payload.player) {
      let merged = this.mergePlayerLists(this.roomState.players, [payload.player]);
      if (this.myPlayer) {
        merged = this.mergePlayerLists(merged, [this.myPlayer]);
      }
      this.roomState.players = merged;

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

    // B) Durum Talebi Geldiğinde (Host Yanıt Verir)
    if (payload.type === 'REQUEST_STATE' && this.isHost) {
      this.publishToCloud(this.roomCode, {
        type: 'STATE_UPDATE',
        roomCode: this.roomCode,
        state: this.roomState
      });
    }

    // C) Güncel Oda Durumu Geldiğinde Oyuncuları Birleştir
    if (payload.type === 'STATE_UPDATE' && payload.state && Array.isArray(payload.state.players)) {
      let mergedPlayers = this.mergePlayerLists(this.roomState.players, payload.state.players);
      if (this.myPlayer) {
        mergedPlayers = this.mergePlayerLists(mergedPlayers, [this.myPlayer]);
      }
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

  // Buluta Yangın Yap (Arka Planda / Non-blocking)
  publishToCloud(code, payload) {
    if (!code) return;
    try {
      fetch(`https://ntfy.sh/defuse_bomb_room_${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      }).catch(e => console.warn("Cloud publish silent warning:", e));
    } catch (e) {
      console.warn("Cloud publish catch:", e);
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