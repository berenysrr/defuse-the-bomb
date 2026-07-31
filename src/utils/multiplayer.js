// %100 GERÇEK ZAMANLI KÜRESEL MULTIPLAYER ODA VE OYUN İÇİ SENKRONİZASYON MOTORU

const FIREBASE_DB_URL = 'https://defuse-bomb-default-rtdb.firebaseio.com/rooms';

class RoomManager {
  constructor() {
    this.roomCode = null;
    this.isHost = false;
    this.listeners = new Map(); // roomCode -> callbacks[]
    this.pollInterval = null;

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
      inGameState: null,
      lastUpdate: Date.now()
    };

    await this.updateCloudRoomState(code, this.roomState);
    this.startCloudPolling(code);

    return code;
  }

  // 2. ODAYA KATIL (Joiner)
  async joinRoom(code, playerConfig) {
    const cleanCode = code.trim().toUpperCase();
    this.roomCode = cleanCode;
    this.isHost = false;

    let cloudState = await this.getCloudRoomState(cleanCode);

    if (!cloudState) {
      cloudState = {
        code: cleanCode,
        hostId: null,
        players: [playerConfig],
        gameState: 'LOBBY',
        inGameState: null,
        lastUpdate: Date.now()
      };
    } else {
      const exists = cloudState.players.some(p => p.id === playerConfig.id || p.name === playerConfig.name);
      if (!exists) {
        cloudState.players.push(playerConfig);
      }
    }

    this.roomState = cloudState;
    await this.updateCloudRoomState(cleanCode, cloudState);
    this.startCloudPolling(cleanCode);

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
    this.roomState.lastUpdate = Date.now();

    await this.updateCloudRoomState(this.roomCode, this.roomState);

    this.notifyListeners(this.roomCode, {
      type: 'GAME_START',
      roomCode: this.roomCode,
      players: players,
      inGameState: initialInGameState
    });
  }

  // 4. OYUN İÇİ CANLI DURUM YAYINLAMA (Kablo kesme, kart atma, soru cevaplama)
  async broadcastInGameState(inGameStatePayload) {
    if (!this.roomCode) return;

    this.roomState.inGameState = inGameStatePayload;
    this.roomState.lastUpdate = Date.now();

    await this.updateCloudRoomState(this.roomCode, this.roomState);

    this.notifyListeners(this.roomCode, {
      type: 'GAME_STATE_UPDATE',
      roomCode: this.roomCode,
      inGameState: inGameStatePayload
    });
  }

  // 5. BULUT CANLI DİNLEYİCİSİ (HER 500MS - REALTIME SYNC)
  startCloudPolling(code) {
    if (this.pollInterval) clearInterval(this.pollInterval);

    const pollCloud = async () => {
      if (!this.roomCode) return;
      const remoteState = await this.getCloudRoomState(code);

      if (remoteState) {
        const isPlayersChanged = JSON.stringify(remoteState.players) !== JSON.stringify(this.roomState.players);
        const isGameStarted = remoteState.gameState === 'PLAYING' && this.roomState.gameState !== 'PLAYING';
        const isInGameStateChanged = JSON.stringify(remoteState.inGameState) !== JSON.stringify(this.roomState.inGameState);

        this.roomState = remoteState;

        if (isPlayersChanged) {
          this.notifyListeners(code, {
            type: 'STATE_UPDATE',
            roomCode: code,
            state: remoteState
          });
        }

        if (isGameStarted) {
          this.notifyListeners(code, {
            type: 'GAME_START',
            roomCode: code,
            players: remoteState.players,
            inGameState: remoteState.inGameState
          });
        }

        if (isInGameStateChanged && remoteState.inGameState) {
          this.notifyListeners(code, {
            type: 'GAME_STATE_UPDATE',
            roomCode: code,
            inGameState: remoteState.inGameState
          });
        }
      }
    };

    pollCloud();
    this.pollInterval = setInterval(pollCloud, 500);
  }

  async getCloudRoomState(code) {
    try {
      const res = await fetch(`${FIREBASE_DB_URL}/${code}.json`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Cloud fetch error:', e);
    }
    return null;
  }

  async updateCloudRoomState(code, state) {
    try {
      await fetch(`${FIREBASE_DB_URL}/${code}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
    } catch (e) {
      console.warn('Cloud update error:', e);
    }
  }

  // ODA KODUNA ÖZEL DİNLEYİCİ (ROOMCODE SPESİFİK SUBSCRIBE)
  subscribe(roomCode, callback) {
    // Eğer tek parametre verilirse callback kabul et
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
    // Global dinleyicileri de bilgilendir
    const globalList = this.listeners.get('GLOBAL');
    if (globalList) {
      globalList.forEach(cb => cb(data));
    }
  }
}

export const roomManager = new RoomManager();
