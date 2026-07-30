import React from 'react';
import { useGame } from '../context/GameContext';

export default function GameLogs() {
  const { players, turnIndex, logs } = useGame();

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* 4 Oyuncu Can Paneli */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
        {players.map((p, idx) => (
          <div
            key={p.id}
            className="glass-panel"
            style={{
              padding: '10px',
              textAlign: 'center',
              border: idx === turnIndex ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
              background: idx === turnIndex ? 'rgba(239, 68, 68, 0.15)' : 'rgba(15, 23, 42, 0.6)',
              opacity: p.lives <= 0 ? 0.4 : 1
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#f8fafc' }}>{p.name}</div>
            <div style={{ fontSize: '14px', marginTop: '4px' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} style={{ opacity: i < p.lives ? 1 : 0.2 }}>❤️</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Olay Günlüğü Akışı */}
      <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
        {logs.map((log, idx) => (
          <div key={idx} style={{ fontSize: '12px', color: idx === 0 ? '#38bdf8' : '#64748b', marginBottom: '2px' }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}