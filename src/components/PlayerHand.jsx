import React from 'react';
import { useGame } from '../context/GameContext';
import { Shield, Sparkles, Zap, RotateCcw, Shuffle, Scissors, Hourglass, RefreshCw, Hand } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const { players, turnIndex, playCard, gameState, isMyTurn } = useGame();

  if (gameState !== 'PLAYING' || !Array.isArray(players) || players.length === 0) return null;

  const safeTurnIndex = turnIndex >= 0 && turnIndex < players.length ? turnIndex : 0;
  const currentPlayer = players[safeTurnIndex];

  if (!currentPlayer) return null;

  const currentHand = Array.isArray(currentPlayer.hand) ? currentPlayer.hand : [];

  return (
    <div style={{ width: '100%', maxWidth: '750px', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '16px', zIndex: 40, margin: '16px auto 0 auto' }}>
      
      {/* SİZİN OYUNCU KİMLİĞİNİZ VE ANİ ÖLÜM ROZETİ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(15, 23, 42, 0.95)', padding: '10px 24px', borderRadius: '20px', border: `2px solid ${isMyTurn ? '#ef4444' : '#64748b'}`, boxShadow: isMyTurn ? '0 0 30px rgba(239, 68, 68, 0.5)' : 'none', marginBottom: '14px' }}>
        <span style={{ fontSize: '32px' }}>{currentPlayer.avatar?.icon || '🐵'}</span>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{currentPlayer.name || 'Oyuncu'}</span>
            {isMyTurn ? (
              <span style={{ color: '#ef4444', fontSize: '11px', background: 'rgba(239, 68, 68, 0.2)', padding: '2px 10px', borderRadius: '12px', fontWeight: '900' }}>
                💥 SIRA SENDE! (HAMLE YAP)
              </span>
            ) : (
              <span style={{ color: '#94a3b8', fontSize: '11px', background: 'rgba(148, 163, 184, 0.2)', padding: '2px 10px', borderRadius: '12px', fontWeight: '900' }}>
                ⏳ SIRA RAKİPTE
              </span>
            )}
          </div>
        </div>

        {currentPlayer.hasShield && (
          <span style={{ fontSize: '11px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', padding: '6px 14px', borderRadius: '14px', fontWeight: 'bold', boxShadow: '0 0 15px rgba(59,130,246,0.6)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Shield size={14} /> KALKAN AKTİF
          </span>
        )}
      </div>

      {/* RENGÂRENK LÜKS AKSİYON KARTLARI */}
      {currentHand.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#94a3b8', background: 'rgba(0,0,0,0.6)', padding: '8px 20px', borderRadius: '12px', margin: 0 }}>
          Hiç aksiyon kartın kalmadı! Hızlı cevap vererek kart kazan! 🎁
        </p>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', width: '100%', flexWrap: 'wrap', opacity: isMyTurn ? 1 : 0.5 }}>
          {currentHand.map((card) => {
            const CardIcon = CARD_ICONS[card.id] || Sparkles;

            return (
              <motion.div
                key={card.uniqueId || Math.random()}
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                whileHover={isMyTurn ? { y: -12, scale: 1.08, zIndex: 30 } : {}}
                whileTap={isMyTurn ? { scale: 0.92 } : {}}
                onClick={() => isMyTurn && playCard(card)}
                className="action-card"
                style={{
                  width: '145px',
                  height: '180px',
                  borderRadius: '18px',
                  padding: '14px 12px',
                  background: `linear-gradient(145deg, ${card.color || '#8b5cf6'} 0%, #090d16 100%)`,
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  boxShadow: `0 12px 25px rgba(0,0,0,0.7), 0 0 20px ${card.color || '#8b5cf6'}40`,
                  cursor: isMyTurn ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  textAlign: 'center',
                  userSelect: 'none'
                }}
              >
                <div>
                  <div style={{ display: 'inline-flex', padding: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', marginBottom: '6px' }}>
                    <CardIcon size={20} color="#ffffff" />
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '900', color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                    {card.name}
                  </div>
                </div>

                <div style={{ fontSize: '10px', color: '#e2e8f0', background: 'rgba(0,0,0,0.6)', padding: '6px', borderRadius: '8px' }}>
                  {card.desc}
                </div>

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