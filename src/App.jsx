import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Lobby from './components/Lobby';
import QuestionCard from './components/QuestionCard';
import MiniGameCard from './components/MiniGameCard';
import Leaderboard from './components/Leaderboard';
import PlayerHand from './components/PlayerHand';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RotateCcw, Scissors, Home, Award, Heart, Sparkles } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Game Render Error Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#fff', background: '#020617', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ color: '#ef4444', fontSize: '26px', marginBottom: '10px' }}>⚠️ ARAYÜZ YÜKLENİRKEN AKSAMA OLUŞTU</h2>
          <p style={{ color: '#94a3b8', maxWidth: '500px', fontSize: '14px', marginBottom: '24px' }}>
            Sayfayı yenileyerek oyuna kaldığınız yerden devam edebilirsiniz.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '14px 32px', fontSize: '16px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 0 20px rgba(245,158,11,0.5)' }}
          >
            🔄 SAYFAYI YENİLE VE BAŞLAT
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function GameBoard() {
  const { 
    gameState, 
    startGame, 
    returnToLobby,
    players, 
    turnIndex, 
    timeLeft, 
    wires, 
    wireEffect, 
    lastPlayedCard,
    currentQuestion, 
    isMyTurn,
    handleMiniGameResult 
  } = useGame();

  if (gameState === 'LOBBY') {
    return <Lobby />;
  }

  const safePlayers = Array.isArray(players) ? players : [];
  const safeTurnIndex = typeof turnIndex === 'number' && turnIndex >= 0 && turnIndex < safePlayers.length ? turnIndex : 0;
  const activePlayer = safePlayers[safeTurnIndex] || { name: 'Oyuncu', avatar: { icon: '🐵' } };
  const safeTimeLeft = typeof timeLeft === 'number' && !isNaN(timeLeft) ? timeLeft : 60;
  const safeWires = Array.isArray(wires) ? wires : [];

  // LÜKS VE MODERN SONUÇ EKRANI (GAME OVER RESULTS SCREEN)
  if (gameState === 'GAME_OVER') {
    // Oyuncuları Skor ve Can değerine göre podyuma diz
    const sortedPodium = [...safePlayers].sort((a, b) => {
      const livesA = typeof a?.lives === 'number' ? a.lives : 0;
      const livesB = typeof b?.lives === 'number' ? b.lives : 0;
      if (livesB !== livesA) return livesB - livesA;
      return (b?.score || 0) - (a?.score || 0);
    });

    const winner = sortedPodium[0] || { name: 'Şampiyon', avatar: { icon: '🏆' }, score: 0 };
    const runnerUp = sortedPodium[1];
    const thirdPlace = sortedPodium[2];

    return (
      <div style={{ maxWidth: '820px', width: '92vw', margin: '30px auto', color: '#f8fafc', textAlign: 'center' }}>
        
        {/* ŞAMPİYONLUK BANNERİ */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(2, 6, 23, 0.9))', padding: '30px 20px', borderRadius: '24px', border: '2px solid #f59e0b', boxShadow: '0 0 50px rgba(245, 158, 11, 0.4)', marginBottom: '24px' }}
        >
          <motion.div animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
            <Trophy size={80} color="#f59e0b" style={{ filter: 'drop-shadow(0 0 30px #f59e0b)', marginBottom: '10px' }} />
          </motion.div>

          <h1 style={{ color: '#fde047', fontSize: '38px', letterSpacing: '4px', margin: '0 0 8px 0', textShadow: '0 0 20px rgba(253, 224, 71, 0.7)' }}>
            ŞAMPİYONLUK PODYUMU
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '15px', margin: 0 }}>
            Tüm patlayıcı kablolar kesildi ve zafer sahibi belirlendi!
          </p>
        </motion.div>

        {/* 🏆 PODYUM DERECELERİ (1., 2., 3. SIRA) */}
        <div style={{ display: 'grid', gridTemplateColumns: sortedPodium.length >= 3 ? '1fr 1.2fr 1fr' : '1fr 1.2fr', gap: '14px', alignItems: 'end', marginBottom: '28px' }}>
          
          {/* 🥈 2. İKİNCİ SIRA */}
          {runnerUp && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ background: '#0f172a', border: '2px solid #94a3b8', padding: '20px 14px', borderRadius: '20px', boxShadow: '0 0 20px rgba(148, 163, 184, 0.3)' }}>
              <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '6px' }}>🥈 2. İKİNCİ</div>
              <div style={{ fontSize: '42px', marginBottom: '4px' }}>{runnerUp.avatar?.icon || '🤖'}</div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#f8fafc' }}>{runnerUp.name}</h3>
              <div style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 'bold' }}>{runnerUp.score || 0} Puan</div>
            </motion.div>
          )}

          {/* 🥇 1. BÜYÜK KAZANAN (ALTIN PODYUM) */}
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), #0f172a)', border: '3px solid #f59e0b', padding: '30px 16px', borderRadius: '24px', boxShadow: '0 0 40px rgba(245, 158, 11, 0.6)', transform: 'translateY(-10px)' }}>
            <div style={{ fontSize: '15px', color: '#fde047', fontWeight: '900', letterSpacing: '2px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Sparkles size={18} color="#fde047" /> 🥇 1. ŞAMPİYON
            </div>
            <div style={{ fontSize: '64px', marginBottom: '6px', filter: 'drop-shadow(0 0 20px #f59e0b)' }}>{winner.avatar?.icon || '👑'}</div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#ffffff', fontWeight: '900' }}>{winner.name}</h2>
            <div style={{ fontSize: '16px', color: '#fde047', fontWeight: 'bold', marginBottom: '10px' }}>{winner.score || 0} Skor Puanı</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', color: '#fca5a5', fontWeight: 'bold' }}>
              <Heart size={14} color="#ef4444" /> {winner.lives || 1} Can İle Tamamladı
            </div>
          </motion.div>

          {/* 🥉 3. ÜÇÜNCÜ SIRA */}
          {thirdPlace && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ background: '#0f172a', border: '2px solid #b45309', padding: '20px 14px', borderRadius: '20px', boxShadow: '0 0 20px rgba(180, 83, 9, 0.3)' }}>
              <div style={{ fontSize: '13px', color: '#b45309', fontWeight: 'bold', marginBottom: '6px' }}>🥉 3. ÜÇÜNCÜ</div>
              <div style={{ fontSize: '42px', marginBottom: '4px' }}>{thirdPlace.avatar?.icon || '🐱'}</div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#f8fafc' }}>{thirdPlace.name}</h3>
              <div style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 'bold' }}>{thirdPlace.score || 0} Puan</div>
            </motion.div>
          )}
        </div>

        {/* AKSİYON BUTONLARI */}
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
          <button
            onClick={() => startGame(safePlayers)}
            style={{ flex: 1, padding: '16px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #f59e0b, #b45309)', color: '#000', fontWeight: '900', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 10px 25px rgba(245, 158, 11, 0.5)' }}
          >
            <RotateCcw size={20} /> YENİDEN OYNA
          </button>

          <button
            onClick={returnToLobby}
            style={{ flex: 1, padding: '16px', borderRadius: '14px', border: '1.5px solid #334155', background: '#0f172a', color: '#fff', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Home size={20} /> 🏠 LOBİYE DÖN
          </button>
        </div>

      </div>
    );
  }

  return (
    <div className="modern-arena-wrapper">
      
      {/* 🚀 1. ÜST BÖLÜM: LOGO VE KULLANICI SIRA BANNERİ */}
      <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto 12px auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* LOGO VE AKTİF OYUNCU DUYURUSU */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#ef4444', letterSpacing: '2px', textShadow: '0 0 15px rgba(239,68,68,0.6)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            💣 DEFUSE THE BOMB 3D
          </h2>

          {/* SIRA BANNERİ */}
          <motion.div
            key={activePlayer?.id || 0}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              background: isMyTurn ? 'linear-gradient(135deg, #22c55e, #15803d)' : 'linear-gradient(135deg, #f59e0b, #b45309)',
              border: `2px solid ${isMyTurn ? '#86efac' : '#fef08a'}`,
              boxShadow: `0 0 25px ${isMyTurn ? 'rgba(34, 197, 94, 0.7)' : 'rgba(245, 158, 11, 0.7)'}`,
              padding: '8px 20px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#ffffff',
              fontWeight: '900',
              fontSize: '15px'
            }}
          >
            <span style={{ fontSize: '22px' }}>{activePlayer?.avatar?.icon || '🐵'}</span>
            <span>
              {isMyTurn 
                ? '👑 SENİN SIRAN! CEVABI SEÇ VE HAMLENİ YAP!' 
                : `⏳ SIRA: ${(activePlayer?.name || 'OYUNCU').toUpperCase()} HAMLE YAPIYOR...`}
            </span>
          </motion.div>
        </div>

        {/* 🏆 CANLI MAÇ SIRALAMA TABLOSU */}
        <Leaderboard />
      </div>

      {/* 💣 2. ORTA BÖLÜM: BÜYÜK BOMBA + KABLO EFEKTİ + GÖRSEL KABLOLAR + SORU / MİNİ OYUN */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '700px', margin: '0 auto', position: 'relative' }}>
        
        {/* KABLO KESİLME VE KART OYNANMA BANNERLARİ */}
        <AnimatePresence>
          {lastPlayedCard && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: -20 }}
              animate={{ scale: 1.1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              style={{
                position: 'absolute',
                top: '-40px',
                zIndex: 100,
                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                border: '2px solid #c084fc',
                boxShadow: '0 0 40px rgba(139, 92, 246, 0.8)',
                padding: '10px 24px',
                borderRadius: '20px',
                color: '#ffffff',
                fontWeight: '900',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <span>🃏 {(lastPlayedCard?.player || 'OYUNCU').toUpperCase()}: {lastPlayedCard?.name} KARTINI OYNADI!</span>
            </motion.div>
          )}
          {wireEffect && (
            <motion.div
              initial={{ scale: 0.3, opacity: 0, y: 20 }}
              animate={{ scale: 1.15, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              style={{
                position: 'absolute',
                top: '-40px',
                zIndex: 100,
                background: '#020617',
                border: `3px solid ${wireEffect.isExplosion ? '#ef4444' : '#22c55e'}`,
                boxShadow: `0 0 50px ${wireEffect.isExplosion ? 'rgba(239,68,68,0.9)' : 'rgba(34,197,94,0.9)'}`,
                padding: '10px 24px',
                borderRadius: '20px',
                color: '#ffffff',
                fontWeight: '900',
                fontSize: '17px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <Scissors color={wireEffect.color} size={24} />
              <span>
                {wireEffect.isExplosion 
                  ? '💥 TUZAK KABLO PATLADI! (-1 CAN GİTTİ)' 
                  : '✂️ GÜVENLİ KABLO KESİLDİ! (Bomba Patlamadı, Canın Sağlam)'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PARLAYAN CANLI BOMBA */}
        <motion.div
          animate={{ scale: safeTimeLeft <= 5 ? [1, 1.2, 1] : [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: safeTimeLeft <= 5 ? 0.35 : 2 }}
          style={{
            position: 'relative',
            width: '135px',
            height: '135px',
            borderRadius: '50%',
            background: '#0f172a',
            border: `4px solid ${safeTimeLeft <= 5 ? '#ff0055' : '#ef4444'}`,
            boxShadow: `0 0 60px ${safeTimeLeft <= 5 ? '#ff0055' : '#ef4444'}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '4px'
          }}
        >
          <img
            src="./bomb.jpg"
            alt="3D Bomb"
            onError={(e) => { e.target.style.display = 'none'; }}
            style={{ width: '95px', height: '95px', objectFit: 'cover', borderRadius: '50%' }}
          />
          <div className="font-mono-tech glow-red" style={{ position: 'absolute', bottom: '-16px', background: '#020617', padding: '3px 16px', borderRadius: '12px', fontSize: '22px', fontWeight: 'bold', color: '#ef4444', border: '1.5px solid #ef4444' }}>
            00:{safeTimeLeft.toString().padStart(2, '0')}
          </div>
        </motion.div>

        {/* 5 GÖRSEL KABLO ÇUBUĞU */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', marginBottom: '6px' }}>
          {safeWires.map(w => (
            <div
              key={w?.id || Math.random()}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '32px',
                  borderRadius: '6px',
                  background: w?.isCut ? '#1e293b' : w?.color || '#ef4444',
                  opacity: w?.isCut ? 0.2 : 1,
                  boxShadow: w?.isCut ? 'none' : `0 0 16px ${w?.color || '#ef4444'}`
                }}
              />
              <span style={{ fontSize: '9px', fontWeight: 'bold', color: w?.isCut ? '#64748b' : w?.color || '#ef4444' }}>
                {w?.isCut ? 'KESİLDİ' : 'SAĞLAM'}
              </span>
            </div>
          ))}
        </div>

        {/* CANLI SORU VEYA MİNİ-OYUN */}
        {currentQuestion?.isMiniGame ? (
          <MiniGameCard miniGame={currentQuestion} onComplete={handleMiniGameResult} />
        ) : (
          <QuestionCard />
        )}
      </div>

      {/* 🎴 3. ALT BÖLÜM: SİZİN LÜKS AKSİYON KARTLARINIZ */}
      <PlayerHand />

    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <GameBoard />
      </GameProvider>
    </ErrorBoundary>
  );
}