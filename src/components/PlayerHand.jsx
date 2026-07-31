import React from 'react';
import { useGame } from '../context/GameContext';
import { Shield, Sparkles, Zap, RotateCcw, Shuffle, Scissors, Hourglass, RefreshCw, Hand } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// İkon Eşleştirmeleri
const CARD_ICONS = {
  'PASS': Shuffle,
  'REVERSE': RotateCcw,
  'CUT_WIRE': Scissors,
  'SPEED_UP': Zap,
  'ADD_TIME': Hourglass,
  'SHIELD': Shield,
  'RESET_WIRES': RefreshCw,
  'STEAL': Hand
};

export default function PlayerHand() {
  const { players, turnIndex, playCard, gameState, lastPlayedCard } = useGame();
  const currentPlayer = players[turnIndex];

  if (gameState !== 'PLAYING' || !currentPlayer) return null;

  return (
    <div style={{ width: '100%', maxWidth: '750px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '16px', zIndex: 40, margin: '16px auto 0 auto' }}>
      
      {/* 🃏 ATILAN KARTIN FIRLAMA ANİMASYONU */}
      <AnimatePresence>
        {lastPlayedCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.3, y: 40, rotate: -15 }}
            animate={{ opacity: 1, scale: 1.3, y: -170, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.4, y: -260 }}
            transition={{ type: 'spring', stiffness: 350, damping: 18 }}
            style={{
              position: 'absolute',
              width: '150px',
              height: '190px',
              borderRadius: '20px',
              padding: '16px',
              background: `linear-gradient(135deg, ${lastPlayedCard.color || '#ef4444'}, #0f172a)`,
              border: '3px solid #fde047',
              boxShadow: '0 0 60px rgba(253, 224, 71, 0.9)',
              color: '#ffffff',
              textAlign: 'center',
              zIndex: 100,
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#fef08a', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {lastPlayedCard.player} OYNADI:
            </div>
            <div style={{ fontSize: '16px', fontWeight: '900' }}>
              {lastPlayedCard.name}
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
              {lastPlayedCard.desc}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SİZİN OYUNCU KİMLİĞİNİZ VE CANINIZ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(15, 23, 42, 0.95)', padding: '10px 24px', borderRadius: '20px', border: '2px solid #f59e0b', boxShadow: '0 0 30px rgba(245, 158, 11, 0.4)', marginBottom: '14px' }}>
        <span style={{ fontSize: '32px' }}>{currentPlayer.avatar?.icon}</span>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{currentPlayer.name}</span>
            <span style={{ color: '#f59e0b', fontSize: '12px', background: 'rgba(245, 158, 11, 0.2)', padding: '2px 10px', borderRadius: '12px' }}>SİZİN KARTLARINIZ</span>
          </div>
          <div style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} style={{ opacity: i < currentPlayer.lives ? 1 : 0.2, filter: i < currentPlayer.lives ? 'drop-shadow(0 0 6px #ef4444)' : 'none' }}>
                ❤️
              </span>
            ))}
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#ef4444', marginLeft: '6px' }}>
              ({currentPlayer.lives}/3 CAN)
            </span>
          </div>
        </div>

        {currentPlayer.hasShield && (
          <span style={{ fontSize: '11px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', padding: '6px 14px', borderRadius: '14px', fontWeight: 'bold', boxShadow: '0 0 15px rgba(59,130,246,0.6)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Shield size={14} /> KALKAN AKTİF
          </span>
        )}
      </div>

      {/* RENGÂRENK LÜKS AKSİYON KARTLARI */}
      {currentPlayer.hand.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#94a3b8', background: 'rgba(0,0,0,0.6)', padding: '8px 20px', borderRadius: '12px', margin: 0 }}>
          Hiç aksiyon kartın kalmadı! Hızlı cevap vererek kart kazan! 🎁
        </p>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', width: '100%', flexWrap: 'wrap' }}>
          {currentPlayer.hand.map((card) => {
            const CardIcon = CARD_ICONS[card.id] || Sparkles;

            return (
              <motion.div
                key={card.uniqueId}
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                whileHover={{ y: -12, scale: 1.08, zIndex: 30 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => playCard(card)}
                className="action-card"
                style={{
                  width: '145px',
                  height: '180px',
                  borderRadius: '18px',
                  padding: '14px 12px',
                  background: `linear-gradient(145deg, ${card.color || '#8b5cf6'} 0%, #090d16 100%)`,
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: `0 12px 25px rgba(0,0,0,0.7), 0 0 20px ${card.color}40`,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  textAlign: 'center',
                  userSelect: 'none'
                }}
              >
                {/* İkon & Başlık */}
                <div>
                  <div style={{ display: 'inline-flex', padding: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', marginBottom: '6px' }}>
                    <CardIcon size={20} color="#ffffff" />
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '900', color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.8)', leading: '1.2' }}>
                    {card.name}
                  </div>
                </div>

                {/* Açıklama */}
                <div style={{ fontSize: '10px', color: '#e2e8f0', background: 'rgba(0,0,0,0.6)', padding: '6px', borderRadius: '8px', backdropFilter: 'blur(4px)' }}>
                  {card.desc}
                </div>

                {/* Buton Etiketi */}
                <div style={{ fontSize: '10px', color: '#fde047', fontWeight: '900', background: 'rgba(0,0,0,0.7)', padding: '4px', borderRadius: '6px', letterSpacing: '0.5px' }}>
                  MASAYA FIRLAT
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}