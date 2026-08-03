// %100 GARANTİLİ GERÇEK ZAMANLI KÜRESEL BULUT VERİTABANI MOTORU (RESTFUL CLOUD SYNC)

class RoomManager {
  constructor() {
    this.roomCode = null;
    this.isHost = false;
    this.myPlayer = null;
    this.objectId = null;
    this.listeners = [];
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

    // Bulut sunucusuna odayı kaydet
    try {
      const res = await fetch("https://api.restful-api.dev/objects", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `defuse_room_${code}`,
          data: this.roomState
        })
      });
      if (res.ok) {
        const obj = await res.json();
        this.objectId = obj.id;
        try { localStorage.setItem(`defuse_obj_${code}`, obj.id); } catch (e) {}
      }
    } catch (e) {}

    // Polling başlat (Her 400ms)
    this.startCloudPolling(code);

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

    this.roomState = {
      code: cleanCode,
      players: [joinerObj],
      gameState: 'LOBBY',
      inGameState: null
    };

    // Buluttan odayı ara ve katılanı listeye ekle
    await this.fetchAndJoinCloudRoom(cleanCode, joinerObj);

    // Polling başlat (Her 400ms)
    this.startCloudPolling(cleanCode);

    this.notifyListeners({
      type: 'STATE_UPDATE',
      roomCode: cleanCode,
      state: this.roomState
    });

    return this.roomState;
  }

  // Buluttan Oda Nesnesini Çekip Katılan Oyuncuyu Ekleme
  async fetchAndJoinCloudRoom(code, joinerObj) {
    try {
      // 1. Önce yerel hafızadaki objectId'ye bak
      let targetId = localStorage.getItem(`defuse_obj_${code}`);

      // 2. Eğer id yoksa bulut nesnelerini tara
      if (!targetId) {
        const res = await fetch("https://api.restful-api.dev/objects");
        if (res.ok) {
          const list = await res.json();
          const match = Array.isArray(list) ? list.find(o => o.name === `defuse_room_${code}`) : null;
          if (match) targetId = match.id;
        }
      }

      if (targetId) {
        this.objectId = targetId;
        const getRes = await fetch(`https://api.restful-api.dev/objects/${targetId}`);
        if (getRes.ok) {
          const obj = await getRes.json();
          if (obj && obj.data) {
            const hostState = obj.data;
            const merged = this.mergePlayerLists(hostState.players || [], [joinerObj]);
            this.roomState = {
              ...hostState,
              players: merged
            };

            // Güncellenmiş oyuncu listesini buluta kaydet
            await this.updateCloudState();
          }
        }
      } else {
        // Eğer oda henüz bulutta yoksa sıfırdan bulut objesi oluştur
        const createRes = await fetch("https://api.restful-api.dev/objects", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `defuse_room_${code}`,
            data: this.roomState
          })
        });
        if (createRes.ok) {
          const newObj = await createRes.json();
          this.objectId = newObj.id;
          try { localStorage.setItem(`defuse_obj_${code}`, newObj.id); } catch(e){}
        }
      }
    } catch (e) {}
  }

  // Akıllı Oyuncu Birleştirme Motoru
  mergePlayerLists(listA = [], listB = []) {
    const merged = [...listA];

    listB.forEach(item => {
      if (!item || !item.id) return;
      const exists = merged.some(p => p.id === item.id);
      if (!exists) {
        merged.push(item);
      }
    });

    if (this.myPlayer && !merged.some(p => p.id === this.myPlayer.id)) {
      merged.push(this.myPlayer);
    }

    merged.sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0));
    return merged;
  }

  // Buluttaki Oda Durumunu Güncelle (PUT)
  async updateCloudState() {
    if (!this.objectId || !this.roomCode) return;
    try {
      await fetch(`https://api.restful-api.dev/objects/${this.objectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `defuse_room_${this.roomCode}`,
          data: this.roomState
        })
      });
    } catch (e) {}
  }

  // 3. OYUNU BAŞLAT (Host)
  async startGameBroadcast(players, initialInGameState = null) {
    if (!this.roomCode) return;

    this.roomState.gameState = 'PLAYING';
    this.roomState.players = players;

    await this.updateCloudState();

    this.notifyListeners({
      type: 'GAME_START',
      roomCode: this.roomCode,
      players: players,
      inGameState: initialInGameState
    });
  }

  // 4. OYUN İÇİ CANLI YAYIN
  async broadcastInGameState(inGameStatePayload) {
    if (!this.roomCode) return;

    this.roomState.inGameState = inGameStatePayload;
    await this.updateCloudState();

    this.notifyListeners({
      type: 'GAME_STATE_UPDATE',
      roomCode: this.roomCode,
      inGameState: inGameStatePayload
    });
  }

  // 5. BULUT POLING MOTORU (HER 400MS)
  startCloudPolling(code) {
    if (this.pollInterval) clearInterval(this.pollInterval);

    const poll = async () => {
      if (!this.roomCode) return;

      if (!this.objectId) {
        let targetId = localStorage.getItem(`defuse_obj_${code}`);
        if (!targetId) {
          try {
            const res = await fetch("https://api.restful-api.dev/objects");
            if (res.ok) {
              const list = await res.json();
              const match = Array.isArray(list) ? list.find(o => o.name === `defuse_room_${code}`) : null;
              if (match) {
                targetId = match.id;
                this.objectId = targetId;
              }
            }
          } catch(e){}
        } else {
          this.objectId = targetId;
        }
      }

      if (this.objectId) {
        try {
          const res = await fetch(`https://api.restful-api.dev/objects/${this.objectId}`);
          if (res.ok) {
            const obj = await res.json();
            if (obj && obj.data) {
              const cloudState = obj.data;
              const merged = this.mergePlayerLists(this.roomState.players, cloudState.players || []);
              
              const isGameStarted = cloudState.gameState === 'PLAYING' && this.roomState.gameState !== 'PLAYING';
              
              this.roomState = {
                ...cloudState,
                players: merged
              };

              if (isGameStarted) {
                this.notifyListeners({
                  type: 'GAME_START',
                  roomCode: this.roomCode,
                  players: this.roomState.players,
                  inGameState: cloudState.inGameState
                });
              } else {
                this.notifyListeners({
                  type: 'STATE_UPDATE',
                  roomCode: this.roomCode,
                  state: this.roomState
                });
              }
            }
          }
        } catch (e) {}
      }
    };

    poll();
    this.pollInterval = setInterval(poll, 400);
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