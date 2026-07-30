import React from 'react';
import { useGame } from '../context/GameContext';
import { Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PlayerHand() {
  const { players, turnIndex, playCard, gameState, lastPlayedCard } = useGame();
  const currentPlayer = players[turnIndex];

  if (gameState !== 'PLAYING' || !currentPlayer) return null;

  return (
    <div style={{ width: '100%', maxWidth: '680px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '16px', zIndex: 40 }}>
      
      {/* FIRLAYAN KART ANİMASYONU */}
      <AnimatePresence>
        {lastPlayedCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.3, y: 30 }}
            animate={{ opacity: 1, scale: 1.25, y: -160 }}
            exit={{ opacity: 0, scale: 0.5, y: -240 }}
            transition={{ type: 'spring', stiffness: 350, damping: 18 }}
            style={{
              position: 'absolute',
              width: '140px',
              height: '180px',
              borderRadius: '16px',
              padding: '16px',
              background: 'linear-gradient(135deg, #ef4444, #7f1d1d)',
              border: '3px solid #fde047',
              boxShadow: '0 0 50px rgba(253,224,71,0.8)',
              color: '#ffffff',
              textAlign: 'center',
              zIndex: 100,
              pointerEvents: 'none'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#fef08a' }}>
              {lastPlayedCard.player} OYNADI:
            </div>
            <div style={{ fontSize: '15px', fontWeight: '900', marginTop: '16px' }}>
              {lastPlayedCard.name}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SİZİN OYUNCU ROZETİNİZ VE NET KALPLERİNİZ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0f172a', padding: '8px 20px', borderRadius: '14px', border: '1.5px solid #f59e0b', boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)', marginBottom: '12px' }}>
        <span style={{ fontSize: '26px' }}>{currentPlayer.avatar?.icon}</span>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '900', color: '#f8fafc' }}>
            {currentPlayer.name} <span style={{ color: '#f59e0b' }}>(SİZİN CANINIZ)</span>
          </div>
          <div style={{ fontSize: '14px', display: 'flex', gap: '4px', marginTop: '2px' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} style={{ opacity: i < currentPlayer.lives ? 1 : 0.2 }}>
                ❤️
              </span>
            ))}
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#ef4444', marginLeft: '6px' }}>
              ({currentPlayer.lives}/3 CAN)
            </span>
          </div>
        </div>

        {currentPlayer.hasShield && (
          <span style={{ fontSize: '10px', background: '#3b82f6', color: '#fff', padding: '4px 10px', borderRadius: '10px', fontWeight: 'bold' }}>
            🛡️ KALKAN
          </span>
        )}
      </div>

      {/* AKSİYON KARTLARI */}
      {currentPlayer.hand.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#94a3b8', background: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: '10px', margin: 0 }}>
          Hiç aksiyon kartın yok! Hızlı cevap vererek kart kazan! 🎁
        </p>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', width: '100%' }}>
          {currentPlayer.hand.map((card) => (
            <motion.div
              key={card.uniqueId}
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              whileHover={{ y: -10, scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => playCard(card)}
              style={{
                width: '140px',
                height: '165px',
                borderRadius: '14px',
                padding: '12px 10px',
                background: `linear-gradient(135deg, ${card.color || '#8b5cf6'}, #0f172a)`,
                border: '2px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                textAlign: 'center',
                userSelect: 'none'
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: '900', color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                {card.name}
              </div>

              <div style={{ fontSize: '10px', color: '#e2e8f0', background: 'rgba(0,0,0,0.6)', padding: '6px', borderRadius: '6px' }}>
                {card.desc}
              </div>

              <div style={{ fontSize: '10px', color: '#fde047', fontWeight: 'bold', background: 'rgba(0,0,0,0.5)', padding: '3px', borderRadius: '4px' }}>
                MASAYA FIRLAT
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}