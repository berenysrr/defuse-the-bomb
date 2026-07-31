import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Lobby from './components/Lobby';
import QuestionCard from './components/QuestionCard';
import MiniGameCard from './components/MiniGameCard';
import Leaderboard from './components/Leaderboard';
import PlayerHand from './components/PlayerHand';
import GameLogs from './components/GameLogs';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RotateCcw, Shield, Scissors } from 'lucide-react';

function GameBoard() {
  const { 
    gameState, 
    startGame, 
    players, 
    turnIndex, 
    timeLeft, 
    wires, 
    wireEffect, 
    lastPlayedCard,
    currentQuestion, 
    handleMiniGameResult 
  } = useGame();

  if (gameState === 'LOBBY') {
    return <Lobby />;
  }

  if (gameState === 'GAME_OVER') {
    const winner = players.find(p => p.lives > 0);
    return (
      <div className="modern-arena-wrapper" style={{ justifyContent: 'center' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel-modern"
          style={{ padding: '50px 40px', textAlign: 'center', maxWidth: '500px', width: '90%', border: '3px solid #f59e0b', boxShadow: '0 0 60px rgba(245, 158, 11, 0.6)', margin: '0 auto' }}
        >
          <motion.div animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <Trophy size={88} color="#f59e0b" style={{ filter: 'drop-shadow(0 0 35px #f59e0b)', marginBottom: '20px' }} />
          </motion.div>
          
          <h1 style={{ color: '#f59e0b', fontSize: '42px', letterSpacing: '3px', margin: '0 0 8px 0' }}>
            ŞAMPİYON!
          </h1>

          <div style={{ fontSize: '56px', marginBottom: '10px' }}>
            {winner?.avatar?.icon}
          </div>

          <h2 style={{ color: '#f8fafc', fontSize: '32px', marginBottom: '20px' }}>
            {winner?.name}
          </h2>

          <p style={{ color: '#94a3b8', marginBottom: '32px', fontSize: '16px' }}>
            Tüm rakipleri eledin ve masadaki tek şampiyon sen oldun! 🏆
          </p>

          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => startGame(players)}
            style={{
              padding: '16px 36px',
              fontSize: '17px',
              fontWeight: 'bold',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#000000',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '0 auto',
              boxShadow: '0 10px 25px rgba(245, 158, 11, 0.5)'
            }}
          >
            <RotateCcw size={20} /> YENİDEN OYNA
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const activePlayer = players[turnIndex];

  return (
    <div className="modern-arena-wrapper">
      
      {/* 🚀 1. ÜST BÖLÜM: LOGO VE SIRA BANNERİ */}
      <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto 12px auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* LOGO VE AKTİF OYUNCU DUYURUSU */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#ef4444', letterSpacing: '2px', textShadow: '0 0 15px rgba(239,68,68,0.6)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            💣 DEFUSE THE BOMB 3D
          </h2>

          {/* SIRA BANNERİ */}
          <motion.div
            key={activePlayer?.id}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #b45309)',
              border: '2px solid #fef08a',
              boxShadow: '0 0 25px rgba(245, 158, 11, 0.7)',
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
            <span style={{ fontSize: '22px' }}>{activePlayer?.avatar?.icon}</span>
            <span>SIRA: {activePlayer?.name?.toUpperCase()} HAMLE YAPIYOR!</span>
          </motion.div>
        </div>

        {/* 🏆 CANLI MAÇ SIRALAMA TABLOSU (1., 2., 3., 4.) */}
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
              <span>🃏 {lastPlayedCard.player?.toUpperCase()}: {lastPlayedCard.name} KARTINI OYNADI!</span>
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
          animate={{ scale: timeLeft <= 5 ? [1, 1.2, 1] : [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: timeLeft <= 5 ? 0.35 : 2 }}
          style={{
            position: 'relative',
            width: '135px',
            height: '135px',
            borderRadius: '50%',
            background: '#0f172a',
            border: `4px solid ${timeLeft <= 5 ? '#ff0055' : '#ef4444'}`,
            boxShadow: `0 0 60px ${timeLeft <= 5 ? '#ff0055' : '#ef4444'}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '4px'
          }}
        >
          <img
            src="/bomb.jpg"
            alt="3D Bomb"
            style={{ width: '95px', height: '95px', objectFit: 'cover', borderRadius: '50%' }}
          />
          <div className="font-mono-tech glow-red" style={{ position: 'absolute', bottom: '-16px', background: '#020617', padding: '3px 16px', borderRadius: '12px', fontSize: '22px', fontWeight: 'bold', color: '#ef4444', border: '1.5px solid #ef4444' }}>
            00:{timeLeft.toString().padStart(2, '0')}
          </div>
        </motion.div>

        {/* 5 GÖRSEL KABLO ÇUBUĞU */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', marginBottom: '6px' }}>
          {wires.map(w => (
            <div
              key={w.id}
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
                  background: w.isCut ? '#1e293b' : w.color,
                  opacity: w.isCut ? 0.2 : 1,
                  boxShadow: w.isCut ? 'none' : `0 0 16px ${w.color}`
                }}
              />
              <span style={{ fontSize: '9px', fontWeight: 'bold', color: w.isCut ? '#64748b' : w.color }}>
                {w.isCut ? 'KESİLDİ' : 'SAĞLAM'}
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
    <GameProvider>
      <GameBoard />
    </GameProvider>
  );
}