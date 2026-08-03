// %100 GERÇEK ZAMANLI KÜRESEL MULTIPLAYER ODA MOTORU (MYPLAYER PROTECTED & ID-ONLY MERGER)

class RoomManager {
  constructor() {
    this.roomCode = null;
    this.isHost = false;
    this.myPlayer = null; // Cihazın kendi oyuncu profil sabiti
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

    const joinerObj = {
      ...playerConfig,
      id: playerConfig.id || Date.now(),
      isHost: false
    };

    this.myPlayer = joinerObj;

    // Bulut polling başlat
    this.startCloudPolling(cleanCode);

    // Bulut geçmişini tara
    const historyMessages = await this.fetchCloudHistory(cleanCode);
    let allFoundPlayers = [joinerObj];

    if (historyMessages && historyMessages.length > 0) {
      historyMessages.forEach(msg => {
        if (msg && msg.state && Array.isArray(msg.state.players)) {
          allFoundPlayers = this.mergePlayerLists(allFoundPlayers, msg.state.players);
        }
        if (msg && msg.player) {
          allFoundPlayers = this.mergePlayerLists(allFoundPlayers, [msg.player]);
        }
      });
    }

    this.roomState = {
      code: cleanCode,
      players: allFoundPlayers,
      gameState: 'LOBBY',
      inGameState: null
    };

    const updatePayload = {
      type: 'STATE_UPDATE',
      roomCode: cleanCode,
      state: this.roomState
    };

    const joinPayload = {
      type: 'JOIN_REQUEST',
      roomCode: cleanCode,
      player: joinerObj,
      state: this.roomState
    };

    // Katılım el sıkışma tekrarları (Handshake Retries)
    await this.publishToCloud(cleanCode, joinPayload);
    await this.publishToCloud(cleanCode, updatePayload);

    setTimeout(() => this.publishToCloud(cleanCode, updatePayload), 500);
    setTimeout(() => this.publishToCloud(cleanCode, updatePayload), 1500);

    this.notifyListeners(updatePayload);
    return this.roomState;
  }

  // Sadece Benzersiz ID İle Oyuncu Birleştirme + Kendi Oyuncunu Daima Koru (myPlayer)
  mergePlayerLists(listA = [], listB = []) {
    const merged = [...listA];

    listB.forEach(item => {
      if (!item || !item.id) return;
      // SADECE BENZERSİZ ID İLE EŞLEŞTİRME (İsim çakışması engellendi)
      const exists = merged.some(p => p.id === item.id);
      if (!exists) {
        merged.push(item);
      }
    });

    // Kendi Oyuncunu Daima Koru (this.myPlayer)
    if (this.myPlayer && !merged.some(p => p.id === this.myPlayer.id)) {
      merged.push(this.myPlayer);
    }

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

  // 5. KÜRESEL BULUT POLING MOTORU (HER 400MS)
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

    // A) Katılım Talebi Geldiğinde
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

    // B) Güncel Oda Durumu Geldiğinde (myPlayer Korunarak Birleştirilir)
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

    // C) Oyunu Başlat Bildirimi
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

    // D) Oyun İçi Canlı Senkronizasyon
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