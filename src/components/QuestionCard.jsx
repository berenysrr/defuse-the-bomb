import React from 'react';
import { useGame } from '../context/GameContext';
import { HelpCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuestionCard() {
  const { currentQuestion, answerQuestion, gameState, timeLeft, isMyTurn, players, turnIndex } = useGame();

  if (gameState !== 'PLAYING' || !currentQuestion) return null;

  const letterBadges = ['A', 'B', 'C', 'D'];
  const currentTurnPlayer = players[turnIndex];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentQuestion.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="glass-panel-modern"
        style={{
          padding: '22px 26px',
          maxWidth: '700px',
          width: '100%',
          textAlign: 'center',
          zIndex: 30,
          marginTop: '16px',
          border: '1.5px solid rgba(245, 158, 11, 0.4)'
        }}
      >
        {/* Soru Başlığı ve Sıra Uyarı Rozeti */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
            <HelpCircle size={20} />
            <h3 style={{ margin: 0, fontSize: '15px', letterSpacing: '1px', fontWeight: 'bold' }}>CANLI SORU:</h3>
          </div>

          {!isMyTurn ? (
            <span style={{ fontSize: '12px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', padding: '4px 14px', borderRadius: '14px', fontWeight: 'bold' }}>
              ⏳ SIRADAKİ OYUNCU: {currentTurnPlayer?.name?.toUpperCase()}
            </span>
          ) : (
            timeLeft > 7 && (
              <motion.span
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                style={{ fontSize: '11px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.2)', padding: '4px 12px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}
              >
                <Zap size={14} /> HIZLI CEVAP BONUSU! (+1 Kart)
              </motion.span>
            )
          )}
        </div>

        {/* Soru Metni */}
        <p style={{ fontSize: '19px', fontWeight: '900', color: '#ffffff', marginBottom: '20px', lineHeight: '1.4' }}>
          {currentQuestion.question}
        </p>

        {/* Sıra Sende Değil Uyarısı Metni */}
        {!isMyTurn && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', marginBottom: '14px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            ✋ SIRA SENDE DEĞİL! {currentTurnPlayer?.name} şu anda cevabı seçiyor...
          </div>
        )}

        {/* 4 Cevap Şıkkı Butonları */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', opacity: isMyTurn ? 1 : 0.45 }}>
          {currentQuestion.options.map((option, idx) => (
            <motion.button
              key={idx}
              disabled={!isMyTurn}
              whileHover={isMyTurn ? { scale: 1.03, backgroundColor: '#334155', borderColor: '#f59e0b' } : {}}
              whileTap={isMyTurn ? { scale: 0.95 } : {}}
              onClick={() => isMyTurn && answerQuestion(idx)}
              style={{
                padding: '14px 16px',
                fontSize: '15px',
                fontWeight: 'bold',
                borderRadius: '12px',
                border: '1.5px solid rgba(255,255,255,0.15)',
                background: '#1e293b',
                color: '#f8fafc',
                cursor: isMyTurn ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'left',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
              }}
            >
              <span style={{ background: isMyTurn ? '#f59e0b' : '#64748b', color: '#020617', fontWeight: '900', padding: '4px 10px', borderRadius: '8px', fontSize: '13px' }}>
                {letterBadges[idx]}
              </span>
              <span style={{ flex: 1 }}>{option}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}