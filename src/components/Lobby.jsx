import React, { useState, useEffect } from 'react';
import { useGame, AVATARS } from '../context/GameContext';
import { roomManager } from '../utils/multiplayer';
import { Bomb, Users, Play, HelpCircle, Copy, Check, Globe, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Lobby() {
  const { startGame } = useGame();
  
  const [mode, setMode] = useState('LOCAL'); 
  const [playerCount, setPlayerCount] = useState(4);
  const [showGuide, setShowGuide] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Oda Durumları
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [joinedPlayers, setJoinedPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  
  // Oyuncu Profil Bilgileri
  const [myName, setMyName] = useState('');
  const [myAvatar, setMyAvatar] = useState(AVATARS[0]);

  // Yerel Oyuncu Yapılandırması (1 Cihazda Oynayanlar İçin)
  const [localConfigs, setLocalConfigs] = useState([
    { id: 0, name: 'Çılgın Maymun', avatar: AVATARS[0] },
    { id: 1, name: 'Cyber Robot', avatar: AVATARS[1] },
    { id: 2, name: 'Ninja Kedi', avatar: AVATARS[2] },
    { id: 3, name: 'Hacker Tilki', avatar: AVATARS[3] }
  ]);

  // URL'de oda kodu var mı kontrol et (?room=XXXX)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setMode('JOIN');
      setInputCode(roomParam.toUpperCase());
    }
  }, []);

  // GERÇEK ZAMANLI KÜRESEL ODA DİNLEYİCİSİ (FIREBASE CLOUD RELAY)
  useEffect(() => {
    const unsubscribe = roomManager.subscribe((payload) => {
      if (!payload) return;

      // 1. Oda durumu güncellendiğinde oyuncu listesini yenile
      if (payload.type === 'STATE_UPDATE' && payload.state) {
        if (payload.state.players && payload.state.players.length > 0) {
          setJoinedPlayers(payload.state.players);
        }
      }

      // 2. Oda kurucusu oyunu başlattığında tüm cihazlarda maçı başlat!
      if (payload.type === 'GAME_START' && payload.players) {
        startGame(payload.players);
      }
    });

    return () => unsubscribe();
  }, [roomCode]);

  // 1 Cihazda oyuncu sayısı değiştiğinde
  const handleCountChange = (count) => {
    setPlayerCount(count);
    const defaultNames = ['Çılgın Maymun', 'Cyber Robot', 'Ninja Kedi', 'Hacker Tilki', 'Uzaylı Alien', 'Gamer Ayı'];
    const updated = Array.from({ length: count }).map((_, idx) => ({
      id: idx,
      name: localConfigs[idx]?.name || defaultNames[idx % defaultNames.length],
      avatar: localConfigs[idx]?.avatar || AVATARS[idx % AVATARS.length]
    }));
    setLocalConfigs(updated);
  };

  // ODA OLUŞTUR (Host)
  const handleCreateRoom = async () => {
    setIsJoining(true);
    const hostPlayer = {
      id: Date.now(),
      name: myName.trim() !== '' ? myName : 'Oda Kurucu',
      avatar: myAvatar
    };
    const code = await roomManager.createRoom(hostPlayer);
    setRoomCode(code);
    setIsHost(true);
    setJoinedPlayers([hostPlayer]);
    setIsJoining(false);
    setMode('ROOM_WAIT');
  };

  // ODAYA KATIL (Joiner)
  const handleJoinRoom = async () => {
    if (!inputCode) return;
    setIsJoining(true);
    const joinerPlayer = {
      id: Date.now(),
      name: myName.trim() !== '' ? myName : `Misafir Oyuncu`,
      avatar: myAvatar
    };
    setIsHost(false);
    const roomState = await roomManager.joinRoom(inputCode, joinerPlayer);
    setRoomCode(inputCode);
    if (roomState && roomState.players) {
      setJoinedPlayers(roomState.players);
    } else {
      setJoinedPlayers([joinerPlayer]);
    }
    setIsJoining(false);
    setMode('ROOM_WAIT');
  };

  // 1. Sadece Oda Kodunu Kopyala (ör: BOMB1)
  const copyOnlyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // 2. Tam Davet Linkini Kopyala (ör: http://...?room=BOMB1)
  const copyFullLink = () => {
    const link = `${window.location.origin}/?room=${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Oyunu Başlat
  const handleStartGame = async () => {
    if (mode === 'ROOM_WAIT') {
      await roomManager.startGameBroadcast(joinedPlayers);
      startGame(joinedPlayers);
    } else {
      startGame(localConfigs);
    }
  };

  return (
    <div style={{ maxWidth: '820px', width: '92vw', margin: '20px auto', color: '#f8fafc' }}>
      
      {/* KILAVUZ MODALI */}
      <AnimatePresence>
        {showGuide && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(12px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="glass-panel" style={{ padding: '30px', maxWidth: '500px', width: '100%', background: '#0f172a', border: '2px solid #f59e0b' }}>
              <h2 style={{ color: '#f59e0b', margin: '0 0 16px 0', fontSize: '22px' }}>📖 NASIL OYNANIR?</h2>
              <ul style={{ lineHeight: '1.7', fontSize: '14px', color: '#cbd5e1', paddingLeft: '20px' }}>
                <li><strong>Oda Oluştur:</strong> Kendi telefonundan "ODA OLUŞTUR" butonuna basıp oda kodunu arkadaşlarınla paylaş!</li>
                <li><strong>Odaya Katıl:</strong> Arkadaşların oda kodunu yazıp kendi telefonlarından katılsın!</li>
                <li><strong>Bomba Ruleti:</strong> Yanlış cevapta 5 kablodan 1'i kesilir (1/5 patlama şansı).</li>
                <li><strong>UNO Kartları:</strong> Masaya kart atarak yönü çevir veya bombayı pasla!</li>
              </ul>
              <button onClick={() => setShowGuide(false)} style={{ marginTop: '20px', width: '100%', padding: '12px', background: '#f59e0b', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                ANLADIM, OYUNA DÖN ➔
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HERO BANNER */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(239,68,68,0.15)', padding: '10px 24px', borderRadius: '30px', border: '1px solid rgba(239,68,68,0.3)', marginBottom: '12px' }}>
          <Bomb size={32} color="#ef4444" />
          <h1 style={{ margin: 0, fontSize: '28px', color: '#ef4444', letterSpacing: '2px', textShadow: '0 0 15px rgba(239,68,68,0.5)' }}>
            DEFUSE THE BOMB 3D
          </h1>
        </div>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
          Arkadaşlarınla Oda Oluştur, Kendi Telefonundan Katıl ve Bombayı İmha Et!
        </p>

        <button onClick={() => setShowGuide(true)} style={{ marginTop: '12px', background: 'transparent', border: '1px solid #f59e0b', color: '#f59e0b', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <HelpCircle size={14} /> Nasıl Oynanır? (Rehber)
        </button>
      </motion.div>

      {/* MOD SEÇİMİ (ODA KUR / ODAYA KATIL / 1 EKRANDA OYNA) */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '24px' }}>
        <button
          onClick={() => setMode('CREATE')}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: '14px',
            border: mode === 'CREATE' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
            background: mode === 'CREATE' ? 'linear-gradient(135deg, #f59e0b, #b45309)' : '#0f172a',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Globe size={18} /> ODA OLUŞTUR (Host)
        </button>

        <button
          onClick={() => setMode('JOIN')}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: '14px',
            border: mode === 'JOIN' ? '2px solid #06b6d4' : '1px solid rgba(255,255,255,0.1)',
            background: mode === 'JOIN' ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : '#0f172a',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Users size={18} /> ODAYA KATIL (Join)
        </button>

        <button
          onClick={() => setMode('LOCAL')}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: '14px',
            border: mode === 'LOCAL' ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
            background: mode === 'LOCAL' ? 'linear-gradient(135deg, #a855f7, #7e22ce)' : '#0f172a',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          🏠 1 EKRANDA OYNA
        </button>
      </div>

      {/* 1. ODA OLUŞTURMA ALANI */}
      {mode === 'CREATE' && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '18px', background: '#0f172a', border: '1.5px solid #f59e0b', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 14px 0', color: '#f59e0b', fontSize: '18px' }}>🌐 KENDİ ODANI OLUŞTUR</h3>
          
          <label style={{ fontSize: '13px', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Adınız:</label>
          <input
            type="text"
            placeholder="İsminizi yazın..."
            value={myName}
            onChange={(e) => setMyName(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: '14px', marginBottom: '16px' }}
          />

          <label style={{ fontSize: '13px', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Avatarınız:</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {AVATARS.map(av => (
              <button
                key={av.id}
                onClick={() => setMyAvatar(av)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '10px',
                  border: myAvatar.id === av.id ? '2px solid #f59e0b' : '1px solid #334155',
                  background: myAvatar.id === av.id ? 'rgba(245,158,11,0.2)' : '#1e293b',
                  fontSize: '22px',
                  cursor: 'pointer'
                }}
              >
                {av.icon}
              </button>
            ))}
          </div>

          <button disabled={isJoining} onClick={handleCreateRoom} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #f59e0b, #b45309)', color: '#fff', fontWeight: 'bold', fontSize: '16px', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {isJoining ? <Loader size={18} className="spin" /> : null}
            <span>ODA KODU AL VE BAŞLAT ➔</span>
          </button>
        </div>
      )}

      {/* 2. ODAYA KATILMA ALANI */}
      {mode === 'JOIN' && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '18px', background: '#0f172a', border: '1.5px solid #06b6d4', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 14px 0', color: '#06b6d4', fontSize: '18px' }}>📲 ARKADAŞININ ODASINA KATIL</h3>

          <label style={{ fontSize: '13px', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Oda Kodu:</label>
          <input
            type="text"
            placeholder="Oda kodunu yazın (ör: BOMB1)..."
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #334155', background: '#1e293b', color: '#f59e0b', fontSize: '18px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '16px' }}
          />

          <label style={{ fontSize: '13px', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Adınız:</label>
          <input
            type="text"
            placeholder="İsminizi yazın..."
            value={myName}
            onChange={(e) => setMyName(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: '14px', marginBottom: '16px' }}
          />

          <label style={{ fontSize: '13px', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Avatarınız:</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {AVATARS.map(av => (
              <button
                key={av.id}
                onClick={() => setMyAvatar(av)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '10px',
                  border: myAvatar.id === av.id ? '2px solid #06b6d4' : '1px solid #334155',
                  background: myAvatar.id === av.id ? 'rgba(6,182,212,0.2)' : '#1e293b',
                  fontSize: '22px',
                  cursor: 'pointer'
                }}
              >
                {av.icon}
              </button>
            ))}
          </div>

          <button disabled={isJoining} onClick={handleJoinRoom} style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#fff', fontWeight: 'bold', fontSize: '16px', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {isJoining ? <Loader size={18} className="spin" /> : null}
            <span>ODAYA KATIL ➔</span>
          </button>
        </div>
      )}

      {/* 3. ODA BEKLEME LOBİSİ (ROOM WAIT) */}
      {mode === 'ROOM_WAIT' && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '18px', background: '#0f172a', border: '2px solid #f59e0b', textAlign: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '20px' }}>ODA KODUNUZ:</h3>
          <div style={{ fontSize: '42px', fontWeight: '900', color: '#fde047', letterSpacing: '6px', margin: '10px 0', textShadow: '0 0 20px rgba(253, 224, 71, 0.6)' }}>
            {roomCode}
          </div>

          {/* 2 AYRI KOPYALAMA BUTONU */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
            <button
              onClick={copyOnlyCode}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                background: '#1e293b',
                border: '1.5px solid #f59e0b',
                color: '#fde047',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {copiedCode ? <Check size={16} color="#22c55e" /> : <Copy size={16} />}
              {copiedCode ? 'KOD KOPYALANDI!' : '📋 SADECE ODA KODUNU KOPYALA'}
            </button>

            <button
              onClick={copyFullLink}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                background: '#1e293b',
                border: '1.5px solid #06b6d4',
                color: '#67e8f9',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {copiedLink ? <Check size={16} color="#22c55e" /> : <Globe size={16} />}
              {copiedLink ? 'LİNK KOPYALANDI!' : '🔗 DAVET LİNKİNİ KOPYALA'}
            </button>
          </div>

          <h4 style={{ color: '#cbd5e1', fontSize: '15px', margin: '0 0 14px 0' }}>Odadaki Oyuncular ({joinedPlayers.length}):</h4>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '26px' }}>
            {joinedPlayers.map((p, idx) => (
              <div key={p.id || idx} style={{ background: '#1e293b', padding: '10px 20px', borderRadius: '14px', border: '1.5px solid #334155', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                <span style={{ fontSize: '26px' }}>{p.avatar?.icon}</span>
                <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>{p.name}</span>
                {idx === 0 && <span style={{ fontSize: '10px', background: '#f59e0b', color: '#000', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold' }}>HOST</span>}
              </div>
            ))}
          </div>

          {/* SADECE ODA KURUCUSUNA (HOST) OYUNU BAŞLAT BUTONU VER! KATILIMCILARA BEKLEME BANNERİ GÖSTER */}
          {isHost ? (
            <button onClick={handleStartGame} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', fontWeight: 'bold', fontSize: '18px', border: 'none', borderRadius: '14px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.5)' }}>
              🎮 OYUNU BAŞLAT! (HOST)
            </button>
          ) : (
            <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(6, 182, 212, 0.15)', border: '1.5px solid #06b6d4', color: '#67e8f9', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <Loader size={20} className="spin" />
              <span>⏳ ODA KURUCUSUNUN (HOST) OYUNU BAŞLATMASI BEKLENİYOR...</span>
            </div>
          )}
        </div>
      )}

      {/* 4. 1 EKRANDA OYNAMA ALANI (LOCAL PARTY) */}
      {mode === 'LOCAL' && (
        <>
          <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', background: '#0f172a', border: '1px solid #334155', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#f59e0b' }}>1 CİHAZDA OYUNCU SAYISI SEÇİN:</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[2, 3, 4, 5, 6].map(num => (
                <button
                  key={num}
                  onClick={() => handleCountChange(num)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: playerCount === num ? '2px solid #f59e0b' : '1px solid #334155',
                    background: playerCount === num ? 'rgba(245,158,11,0.25)' : '#1e293b',
                    color: playerCount === num ? '#fde047' : '#94a3b8',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {num} Oyuncu
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {localConfigs.map((config, idx) => (
              <div key={config.id} className="glass-panel" style={{ padding: '14px', background: '#0f172a', border: '1px solid #334155' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '6px' }}>{idx + 1}. OYUNCU</div>
                <input
                  type="text"
                  placeholder={`${idx + 1}. Oyuncu Adı...`}
                  value={config.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalConfigs(prev => prev.map((c, i) => i === idx ? { ...c, name: val } : c));
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: '13px', marginBottom: '10px' }}
                />
                <div style={{ display: 'flex', gap: '4px' }}>
                  {AVATARS.map(av => (
                    <button
                      key={av.id}
                      onClick={() => setLocalConfigs(prev => prev.map((c, i) => i === idx ? { ...c, avatar: av } : c))}
                      style={{
                        flex: 1,
                        padding: '4px',
                        borderRadius: '6px',
                        border: config.avatar.id === av.id ? '2px solid #f59e0b' : '1px solid transparent',
                        background: config.avatar.id === av.id ? 'rgba(245,158,11,0.2)' : 'transparent',
                        fontSize: '16px',
                        cursor: 'pointer'
                      }}
                    >
                      {av.icon}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleStartGame} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', fontWeight: 'bold', fontSize: '18px', border: 'none', borderRadius: '14px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(239, 68, 68, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <Play size={20} /> 1 CİHAZDA OYUNU BAŞLAT!
          </button>
        </>
      )}

    </div>
  );
}
