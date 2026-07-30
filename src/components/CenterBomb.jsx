import React from 'react';
import { useGame } from '../context/GameContext';
import { Flame } from 'lucide-react';

export default function CenterBomb() {
  const { timeLeft, wires, players, turnIndex } = useGame();
  const currentTurnPlayer = players[turnIndex];

  return (
    <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', position: 'relative', border: '2px solid rgba(239, 68, 68, 0.4)', marginBottom: '20px' }}>

      {/* Kime Ait Olduğu Göstergesi */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
        <Flame color="#ef4444" className="animate-bounce" size={24} />
        <span style={{ fontSize: '14px', color: '#94a3b8' }}>BOMBA KUCAĞINDA:</span>
        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444', textShadow: '0 0 10px #ef4444' }}>
          {currentTurnPlayer?.name}
        </span>
      </div>

      {/* Dijital Geri Sayım Saati */}
      <div
        className="font-mono-tech glow-red"
        style={{
          fontSize: '48px',
          fontWeight: '900',
          color: timeLeft <= 5 ? '#ff0055' : '#ef4444',
          background: 'rgba(0,0,0,0.6)',
          padding: '8px 24px',
          borderRadius: '12px',
          display: 'inline-block',
          marginBottom: '16px',
          letterSpacing: '4px'
        }}
      >
        00:{timeLeft.toString().padStart(2, '0')}
      </div>

      {/* Renkli Kablo Ruleti Çizgileri */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '8px' }}>
        {wires.map((wire) => (
          <div
            key={wire.id}
            style={{
              width: '14px',
              height: '40px',
              borderRadius: '6px',
              background: wire.isCut ? '#1e293b' : wire.color,
              boxShadow: wire.isCut ? 'none' : `0 0 12px ${wire.color}`,
              opacity: wire.isCut ? 0.2 : 1,
              transition: 'all 0.3s ease'
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', margin: 0 }}>
        * Kesilen kablolar kararır. Patlayıcı kabloya denk gelen elenir!
      </p>
    </div>
  );
}