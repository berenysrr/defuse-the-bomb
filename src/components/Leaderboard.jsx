import React from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, Medal, Award, Skull } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Leaderboard() {
  const { players, turnIndex } = useGame();

  // Oyuncuları Can > Puan sırasına göre canlı sırala
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.lives !== a.lives) return b.lives - a.lives;
    return (b.score || 0) - (a.score || 0);
  });

  const medalIcons = [
    <Trophy size={16} color="#f59e0b" />,
    <Medal size={16} color="#94a3b8" />,
    <Award size={16} color="#b45309" />
  ];

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto 14px auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* BAŞLIK VE CANLI SIRALAMA SÜTUNLARI */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', width: '100%', flexWrap: 'wrap' }}>
        {sortedPlayers.map((p, rankIdx) => {
          const isTurn = players[turnIndex]?.id === p.id;

          return (
            <motion.div
              key={p.id}
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
                opacity: p.lives <= 0 ? 0.3 : 1,
                minWidth: '170px'
              }}
            >
              {/* SIRALAMA DERECESİ */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '12px' }}>
                {p.lives > 0 ? (medalIcons[rankIdx] || `#${rankIdx + 1}`) : <Skull size={16} color="#ef4444" />}
              </div>

              <span style={{ fontSize: '22px' }}>{p.avatar?.icon}</span>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: isTurn ? '#fde047' : '#f8fafc', whiteSpace: 'nowrap' }}>
                  {p.name} {isTurn ? '💣' : ''}
                </div>
                <div style={{ fontSize: '11px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <span key={i} style={{ opacity: i < p.lives ? 1 : 0.2, filter: i < p.lives ? 'drop-shadow(0 0 4px #ef4444)' : 'none' }}>
                      ❤️
                    </span>
                  ))}
                  <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 'bold', marginLeft: '4px' }}>
                    ({p.score || 0} p)
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
