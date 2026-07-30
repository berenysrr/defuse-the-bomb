import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import Lobby from './components/Lobby';
import QuestionCard from './components/QuestionCard';
import PlayerHand from './components/PlayerHand';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RotateCcw, Shield, Scissors } from 'lucide-react';

function GameBoard() {
  const { gameState, startGame, players, turnIndex, timeLeft, wires, wireEffect } = useGame();

  if (gameState === 'LOBBY') {
    return <Lobby />;
  }

  if (gameState === 'GAME_OVER') {
    const winner = players.find(p => p.lives > 0);
    return (
      <div className="clean-arena-wrapper" style={{ justifyContent: 'center' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ padding: '40px 30px', textAlign: 'center', maxWidth: '480px', width: '90%', background: '#0f172a', borderRadius: '20px', border: '3px solid #eab308', boxShadow: '0 0 50px #eab308', margin: '0 auto' }}
        >
          <motion.div animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <Trophy size={80} color="#eab308" style={{ filter: 'drop-shadow(0 0 35px #eab308)', marginBottom: '16px' }} />
          </motion.div>
          
          <h1 style={{ color: '#eab308', fontSize: '36px', letterSpacing: '2px', margin: '0 0 8px 0' }}>
            ŞAMPİYON!
          </h1>

          <div style={{ fontSize: '48px', marginBottom: '8px' }}>
            {winner?.avatar?.icon}
          </div>

          <h2 style={{ color: '#f8fafc', fontSize: '28px', marginBottom: '20px' }}>
            {winner?.name}
          </h2>

          <p style={{ color: '#94a3b8', marginBottom: '28px', fontSize: '15px' }}>
            Tüm rakipleri eledin ve şampiyon sen oldun! 🏆
          </p>

          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => startGame(players)}
            style={{
              padding: '14px 32px',
              fontSize: '16px',
              fontWeight: 'bold',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #eab308, #ca8a04)',
              color: '#000000',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '0 auto',
              boxShadow: '0 10px 25px rgba(234, 179, 8, 0.5)'
            }}
          >
            <RotateCcw size={18} /> YENİDEN OYNA
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const activePlayer = players[turnIndex];

  return (
    <div className="clean-arena-wrapper">
      
      {/* 🚀 1. SIRA VE OYUNCULAR (ÜST BÖLÜM - 1 BAKIŞTA ANLAŞILIR) */}
      <div style={{ width: '100%', maxWidth: '750px', margin: '0 auto 16px auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* AKTİF TUR DUYURUSU */}
        <motion.div
          key={activePlayer?.id}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #b45309)',
            border: '2px solid #fef08a',
            boxShadow: '0 0 25px rgba(245, 158, 11, 0.7)',
            padding: '8px 24px',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#ffffff',
            fontWeight: '900',
            fontSize: '16px',
            marginBottom: '14px'
          }}
        >
          <span style={{ fontSize: '22px' }}>{activePlayer?.avatar?.icon}</span>
          <span>SIRA: {activePlayer?.name?.toUpperCase()} HAMLE YAPIYOR!</span>
        </motion.div>

        {/* 4 OYUNCUNUN SADE TEK BARI */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', width: '100%', flexWrap: 'wrap' }}>
          {players.map((p, idx) => {
            const isTurn = idx === turnIndex;
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  background: isTurn ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.35), #0f172a)' : '#0f172a',
                  border: isTurn ? '2.5px solid #f59e0b' : '1.5px solid rgba(255,255,255,0.1)',
                  boxShadow: isTurn ? '0 0 20px rgba(245, 158, 11, 0.5)' : 'none',
                  opacity: p.lives <= 0 ? 0.3 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '22px' }}>{p.avatar?.icon}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: isTurn ? '#fde047' : '#f8fafc' }}>
                    {p.name} {isTurn ? '💣' : ''}
                  </div>
                  <div style={{ fontSize: '11px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <span key={i} style={{ opacity: i < p.lives ? 1 : 0.2, filter: i < p.lives ? 'drop-shadow(0 0 4px #ef4444)' : 'none' }}>
                        ❤️
                      </span>
                    ))}
                    <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 'bold', marginLeft: '4px' }}>
                      ({p.lives}/3)
                    </span>
                  </div>
                </div>
                {p.hasShield && <Shield size={12} color="#3b82f6" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* 💣 2. BÖLÜM: ORTADAKİ CANLI BOMBA VE SORU */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '680px', margin: '0 auto', position: 'relative' }}>
        
        {/* ANLIK KABLO EFEKTİ */}
        <AnimatePresence>
          {wireEffect && (
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              style={{
                position: 'absolute',
                top: '-30px',
                zIndex: 100,
                background: '#020617',
                border: `3px solid ${wireEffect.isExplosion ? '#ef4444' : '#22c55e'}`,
                boxShadow: `0 0 40px ${wireEffect.isExplosion ? '#ef4444' : '#22c55e'}`,
                padding: '8px 20px',
                borderRadius: '16px',
                color: '#ffffff',
                fontWeight: '900',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Scissors color={wireEffect.color} size={22} />
              <span>{wireEffect.isExplosion ? '💥 PATLAYICI KABLO! (-1 CAN)' : '✂️ GÜVENLİ KABLO! (CAN GİTMEDİ)'}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PARLAYAN BOMBA */}
        <motion.div
          animate={{ scale: timeLeft <= 3 ? [1, 1.18, 1] : [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: timeLeft <= 3 ? 0.35 : 2 }}
          style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: '#0f172a',
            border: `4px solid ${timeLeft <= 3 ? '#ff0055' : '#ef4444'}`,
            boxShadow: `0 0 50px ${timeLeft <= 3 ? '#ff0055' : '#ef4444'}`,
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
            style={{ width: '85px', height: '85px', objectFit: 'cover', borderRadius: '50%' }}
          />
          <div className="font-mono-tech glow-red" style={{ position: 'absolute', bottom: '-14px', background: '#020617', padding: '2px 14px', borderRadius: '10px', fontSize: '19px', fontWeight: 'bold', color: '#ef4444', border: '1.5px solid #ef4444' }}>
            00:{timeLeft.toString().padStart(2, '0')}
          </div>
        </motion.div>

        {/* 5 KABLO ÇUBUĞU */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', marginBottom: '4px' }}>
          {wires.map(w => (
            <div
              key={w.id}
              style={{
                width: '12px',
                height: '26px',
                borderRadius: '4px',
                background: w.isCut ? '#1e293b' : w.color,
                opacity: w.isCut ? 0.2 : 1,
                boxShadow: w.isCut ? 'none' : `0 0 14px ${w.color}`
              }}
            />
          ))}
        </div>

        {/* CANLI SORU */}
        <QuestionCard />
      </div>

      {/* 🎴 3. BÖLÜM: SİZİN AKSİYON KARTLARINIZ (ALT BÖLÜM) */}
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