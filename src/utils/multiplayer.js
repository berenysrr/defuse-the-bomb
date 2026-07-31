// GÜVENİLİR KÜRESEL İNTERNET ODA SENKRONİZASYON MOTORU (HTTP CLOUD POLLING ENGINE)

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
      gameState: 'LOBBY'
    };
  }

  // 1. ODA OLUŞTUR (Host)
  createRoom(hostPlayerConfig) {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.roomCode = code;
    this.isHost = true;

    this.roomState = {
      code,
      hostId: hostPlayerConfig.id,
      players: [hostPlayerConfig],
      gameState: 'LOBBY'
    };

    // Bulut polling başlat (0.8s aralıkla)
    this.startCloudPolling(code);

    // İlk oda durumunu yayınla
    this.broadcastStateToCloud(this.roomState);
    return code;
  }

  // 2. ODAYA KATIL (Joiner)
  joinRoom(code, playerConfig) {
    const cleanCode = code.toUpperCase();
    this.roomCode = cleanCode;
    this.isHost = false;

    this.roomState = {
      code: cleanCode,
      players: [playerConfig],
      gameState: 'LOBBY'
    };

    // Bulut polling başlat (0.8s aralıkla)
    this.startCloudPolling(cleanCode);

    // Host'a Katılma İsteği Gönder (JOIN_REQUEST)
    const joinPayload = {
      type: 'JOIN_REQUEST',
      roomCode: cleanCode,
      player: playerConfig
    };
    this.publishToCloud(cleanCode, joinPayload);

    return this.roomState;
  }

  // 3. BULUT POLING MOTORU (NTFY POLL ENDPOINT - %100 TÜM TELEFONLARDA ÇALIŞIR)
  startCloudPolling(code) {
    if (this.pollInterval) clearInterval(this.pollInterval);

    const pollCloud = async () => {
      try {
        const response = await fetch(`https://ntfy.sh/defuse_bomb_room_${code}/json?poll=1&since=10m`);
        if (!response.ok) return;

        const text = await response.text();
        const lines = text.trim().split('\n');

        lines.forEach(line => {
          if (!line) return;
          try {
            const data = JSON.parse(line);
            if (data && data.id && !this.processedMsgIds.has(data.id)) {
              this.processedMsgIds.add(data.id);
              if (data.message) {
                const payload = JSON.parse(data.message);
                this.handleCloudPayload(payload);
              }
            }
          } catch (e) {}
        });
      } catch (e) {}
    };

    // Anında ilk sorguyu yap
    pollCloud();

    // Her 800ms'de bir sorgula
    this.pollInterval = setInterval(pollCloud, 800);
  }

  // Buluttan Gelen Mesajları İşle
  handleCloudPayload(payload) {
    if (!payload || payload.roomCode !== this.roomCode) return;

    // A) Oda Kurucusu (Host) Katılan Oyuncuyu Kabul Eder
    if (payload.type === 'JOIN_REQUEST' && payload.player && this.isHost) {
      const exists = this.roomState.players.some(p => p.id === payload.player.id || p.name === payload.player.name);
      if (!exists) {
        this.roomState.players.push(payload.player);
        this.broadcastStateToCloud(this.roomState);
      }
    }

    // B) Güncel Oda Durumu Yayınlandığında
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

    // C) Oyunu Başlat Bildirimi
    if (payload.type === 'GAME_START') {
      this.roomState.gameState = 'PLAYING';
      if (payload.players && payload.players.length > 0) {
        this.roomState.players = payload.players;
      }
      this.notifyListeners({
        type: 'GAME_START',
        roomCode: this.roomCode,
        players: this.roomState.players
      });
    }
  }

  // Buluta Güncel Durumu Yayınla (Host)
  broadcastStateToCloud(state) {
    const payload = {
      type: 'STATE_UPDATE',
      roomCode: state.code,
      state: state
    };
    this.publishToCloud(state.code, payload);
  }

  // Oyunu Başlat Yayınla (Host)
  startGameBroadcast(players) {
    this.roomState.gameState = 'PLAYING';
    this.roomState.players = players;

    const payload = {
      type: 'GAME_START',
      roomCode: this.roomCode,
      players: players
    };
    this.publishToCloud(this.roomCode, payload);
  }

  // ntfy.sh Üzerinden Yayın Yap
  publishToCloud(code, payload) {
    try {
      fetch(`https://ntfy.sh/defuse_bomb_room_${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      }).catch(e => console.warn('ntfy publish error:', e));
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
