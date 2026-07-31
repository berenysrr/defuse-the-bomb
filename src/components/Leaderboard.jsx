import React from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, Medal, Award, Skull } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Leaderboard() {
  const { players, turnIndex } = useGame();

  const safePlayers = Array.isArray(players) ? players : [];
  const safeTurnIndex = typeof turnIndex === 'number' && turnIndex >= 0 && turnIndex < safePlayers.length ? turnIndex : 0;

  // Oyuncuları Can > Puan sırasına göre canlı sırala
  const sortedPlayers = [...safePlayers].sort((a, b) => {
    const livesA = typeof a?.lives === 'number' ? a.lives : 1;
    const livesB = typeof b?.lives === 'number' ? b.lives : 1;
    if (livesB !== livesA) return livesB - livesA;
    return (b?.score || 0) - (a?.score || 0);
  });

  const medalIcons = [
    <Trophy key="t" size={16} color="#f59e0b" />,
    <Medal key="m" size={16} color="#94a3b8" />,
    <Award key="a" size={16} color="#b45309" />
  ];

  if (safePlayers.length === 0) return null;

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto 14px auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* BAŞLIK VE CANLI SIRALAMA SÜTUNLARI */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', width: '100%', flexWrap: 'wrap' }}>
        {sortedPlayers.map((p, rankIdx) => {
          const isTurn = safePlayers[safeTurnIndex]?.id === p?.id;
          const lives = typeof p?.lives === 'number' ? p.lives : 1;

          return (
            <motion.div
              key={p?.id || rankIdx}
              animate={{ scale: isTurn ? 1.05 : 1 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '14px',
                background: isTurn ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.35), #0f172a)' : '#0f172a',
                border: isTurn ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.12)',
                boxShadow: isTurn ? '0 0 20px rgba(245, 158, 11, 0.5)' : 'none',
                opacity: lives <= 0 ? 0.3 : 1,
                minWidth: '170px'
              }}
            >
              {/* SIRALAMA DERECESİ */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '12px' }}>
                {lives > 0 ? (medalIcons[rankIdx] || `#${rankIdx + 1}`) : <Skull size={16} color="#ef4444" />}
              </div>

              <span style={{ fontSize: '22px' }}>{p?.avatar?.icon || '🐵'}</span>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: isTurn ? '#fde047' : '#f8fafc', whiteSpace: 'nowrap' }}>
                  {p?.name || 'Oyuncu'} {isTurn ? '💣' : ''}
                </div>
                <div style={{ fontSize: '11px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} style={{ opacity: i < lives ? 1 : 0.2, filter: i < lives ? 'drop-shadow(0 0 4px #ef4444)' : 'none' }}>
                      ❤️
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
