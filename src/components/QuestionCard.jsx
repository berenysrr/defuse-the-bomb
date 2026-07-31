import React from 'react';
import { useGame } from '../context/GameContext';
import { HelpCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuestionCard() {
  const { currentQuestion, answerQuestion, gameState, timeLeft } = useGame();

  if (gameState !== 'PLAYING' || !currentQuestion) return null;

  const letterBadges = ['A', 'B', 'C', 'D'];

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
        {/* Soru Başlığı */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
            <HelpCircle size={20} />
            <h3 style={{ margin: 0, fontSize: '15px', letterSpacing: '1px', fontWeight: 'bold' }}>CANLI SORU:</h3>
          </div>
          {timeLeft > 7 && (
            <motion.span
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              style={{ fontSize: '11px', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.2)', padding: '4px 12px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}
            >
              <Zap size={14} /> HIZLI CEVAP BONUSU! (+1 Kart)
            </motion.span>
          )}
        </div>

        {/* Soru Metni */}
        <p style={{ fontSize: '19px', fontWeight: '900', color: '#ffffff', marginBottom: '20px', lineHeight: '1.4' }}>
          {currentQuestion.question}
        </p>

        {/* 4 Cevap Şıkkı Butonları */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {currentQuestion.options.map((option, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.03, backgroundColor: '#334155', borderColor: '#f59e0b' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => answerQuestion(idx)}
              style={{
                padding: '14px 16px',
                fontSize: '15px',
                fontWeight: 'bold',
                borderRadius: '12px',
                border: '1.5px solid rgba(255,255,255,0.15)',
                background: '#1e293b',
                color: '#f8fafc',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'left',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
              }}
            >
              <span style={{ background: '#f59e0b', color: '#020617', fontWeight: '900', padding: '4px 10px', borderRadius: '8px', fontSize: '13px' }}>
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