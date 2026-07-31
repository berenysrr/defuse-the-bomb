// %100 GÜVENİLİR KÜRESEL GERÇEK ZAMANLI VERİTABANI MOTORU (FIREBASE REALTIME CLOUD RELAY)

const FIREBASE_DB_URL = 'https://defuse-bomb-default-rtdb.firebaseio.com/rooms';

class RoomManager {
  constructor() {
    this.roomCode = null;
    this.isHost = false;
    this.listeners = [];
    this.pollInterval = null;

    this.roomState = {
      code: null,
      players: [],
      gameState: 'LOBBY'
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
      lastUpdate: Date.now()
    };

    // Bulut Veritabanına Odayı Kaydet
    await this.updateCloudRoomState(code, this.roomState);

    // Bulut Canlı Dinleyicisini Başlat (Her 600ms)
    this.startCloudPolling(code);

    return code;
  }

  // 2. ODAYA KATIL (Joiner)
  async joinRoom(code, playerConfig) {
    const cleanCode = code.toUpperCase();
    this.roomCode = cleanCode;
    this.isHost = false;

    // Buluttan Mevcut Odayı Çek
    let cloudState = await this.getCloudRoomState(cleanCode);

    if (!cloudState) {
      cloudState = {
        code: cleanCode,
        hostId: null,
        players: [playerConfig],
        gameState: 'LOBBY',
        lastUpdate: Date.now()
      };
    } else {
      const exists = cloudState.players.some(p => p.id === playerConfig.id || p.name === playerConfig.name);
      if (!exists) {
        cloudState.players.push(playerConfig);
      }
    }

    this.roomState = cloudState;

    // Güncellenmiş Oyuncu Listesini Buluta Yaz
    await this.updateCloudRoomState(cleanCode, cloudState);

    // Bulut Canlı Dinleyicisini Başlat (Her 600ms)
    this.startCloudPolling(cleanCode);

    return this.roomState;
  }

  // 3. OYUNU BAŞLAT (Host)
  async startGameBroadcast(players) {
    if (!this.roomCode) return;

    this.roomState.gameState = 'PLAYING';
    this.roomState.players = players;
    this.roomState.lastUpdate = Date.now();

    await this.updateCloudRoomState(this.roomCode, this.roomState);

    this.notifyListeners({
      type: 'GAME_START',
      roomCode: this.roomCode,
      players: players
    });
  }

  // 4. BULUT CANLI SORGULAMA MOTORU (FIREBASE CLOUD POLLING - HER 600MS)
  startCloudPolling(code) {
    if (this.pollInterval) clearInterval(this.pollInterval);

    const pollCloud = async () => {
      if (!this.roomCode) return;
      const remoteState = await this.getCloudRoomState(code);

      if (remoteState) {
        // Eğer buluttaki durum değiştikçe dinleyicilere bildir
        const isPlayersChanged = JSON.stringify(remoteState.players) !== JSON.stringify(this.roomState.players);
        const isGameStarted = remoteState.gameState === 'PLAYING' && this.roomState.gameState !== 'PLAYING';

        this.roomState = remoteState;

        if (isPlayersChanged) {
          this.notifyListeners({
            type: 'STATE_UPDATE',
            roomCode: code,
            state: remoteState
          });
        }

        if (isGameStarted) {
          this.notifyListeners({
            type: 'GAME_START',
            roomCode: code,
            players: remoteState.players
          });
        }
      }
    };

    pollCloud();
    this.pollInterval = setInterval(pollCloud, 600);
  }

  // FIREBASE REST API ÇAĞRILARI
  async getCloudRoomState(code) {
    try {
      const res = await fetch(`${FIREBASE_DB_URL}/${code}.json`);
      if (res.ok) {
        const data = await res.json();
        return data;
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
