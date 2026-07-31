import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, Zap, Target, Lock } from 'lucide-react';
import { sounds } from '../utils/audio';

import { useGame } from '../context/GameContext';

export default function MiniGameCard({ miniGame, onComplete }) {
  const { isMyTurn, players, turnIndex } = useGame();
  const currentTurnPlayer = players[turnIndex];

  // Mini Oyun Tip 1: Şifre Çözme
  const [targetCode, setTargetCode] = useState([7, 4, 2]);
  const [inputCode, setInputCode] = useState([]);

  // Mini Oyun Tip 2: Yeşil Buton Refleksi
  const [isGreen, setIsGreen] = useState(false);
  const [tappedSuccess, setTappedSuccess] = useState(false);

  useEffect(() => {
    if (miniGame?.type === 'CODE_BREAKER') {
      const c1 = Math.floor(Math.random() * 9) + 1;
      const c2 = Math.floor(Math.random() * 9) + 1;
      const c3 = Math.floor(Math.random() * 9) + 1;
      setTargetCode([c1, c2, c3]);
      setInputCode([]);
    } else if (miniGame?.type === 'REFLEX_TAP') {
      setIsGreen(false);
      setTappedSuccess(false);
      const delay = Math.floor(Math.random() * 1500) + 1000;
      const timer = setTimeout(() => {
        setIsGreen(true);
        sounds.playBeep(1200, 0.1);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [miniGame]);

  const handleKeypadPress = (num) => {
    if (!isMyTurn) return;
    sounds.playBeep(800, 0.05);
    const newCode = [...inputCode, num];
    setInputCode(newCode);

    if (newCode.length === 3) {
      if (newCode[0] === targetCode[0] && newCode[1] === targetCode[1] && newCode[2] === targetCode[2]) {
        onComplete(true);
      } else {
        onComplete(false);
      }
    }
  };

  const handleReflexTap = () => {
    if (!isMyTurn) return;
    if (isGreen && !tappedSuccess) {
      setTappedSuccess(true);
      onComplete(true);
    } else {
      onComplete(false);
    }
  };

  if (!miniGame) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel-modern"
      style={{
        padding: '20px 24px',
        maxWidth: '680px',
        width: '100%',
        textAlign: 'center',
        zIndex: 30,
        marginTop: '14px',
        border: '2px solid #06b6d4',
        boxShadow: '0 0 35px rgba(6, 182, 212, 0.4)'
      }}
    >
      {/* 🧩 MİNİ OYUN 1: ŞİFRE ÇÖZME */}
      {miniGame.type === 'CODE_BREAKER' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#06b6d4', marginBottom: '8px' }}>
            <Lock size={20} />
            <h3 style={{ margin: 0, fontSize: '15px', letterSpacing: '1px', fontWeight: 'bold' }}>HIZLI MİNİ OYUN: ŞİFREYİ GİR!</h3>
          </div>

          <p style={{ fontSize: '15px', color: '#cbd5e1', marginBottom: '14px' }}>
            Bomba kilidini açmak için ekrandaki 3 haneli şifreyi hızlıca gir:
          </p>

          {/* HEDEF ŞİFRE */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
            {targetCode.map((num, i) => (
              <div
                key={i}
                style={{
                  width: '45px',
                  height: '55px',
                  borderRadius: '10px',
                  background: inputCode[i] !== undefined ? '#06b6d4' : '#1e293b',
                  color: inputCode[i] !== undefined ? '#000' : '#f59e0b',
                  fontSize: '24px',
                  fontWeight: '900',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #06b6d4'
                }}
              >
                {inputCode[i] !== undefined ? inputCode[i] : num}
              </div>
            ))}
          </div>

          {/* TUŞ TAKIMI (1-9) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxWidth: '280px', margin: '0 auto' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleKeypadPress(num)}
                style={{
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: '#1e293b',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 🎯 MİNİ OYUN 2: REFLEKS İMHASI */}
      {miniGame.type === 'REFLEX_TAP' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#06b6d4', marginBottom: '8px' }}>
            <Target size={20} />
            <h3 style={{ margin: 0, fontSize: '15px', letterSpacing: '1px', fontWeight: 'bold' }}>HIZLI MİNİ OYUN: REFLEKS TESTİ!</h3>
          </div>

          <p style={{ fontSize: '15px', color: '#cbd5e1', marginBottom: '20px' }}>
            Buton YEŞİL olduğunda 1 saniye içinde dokun!
          </p>

          <motion.button
            animate={{ scale: isGreen ? [1, 1.15, 1] : 1 }}
            transition={{ repeat: isGreen ? Infinity : 0, duration: 0.4 }}
            onClick={handleReflexTap}
            style={{
              width: '180px',
              height: '90px',
              borderRadius: '20px',
              border: 'none',
              background: isGreen ? 'linear-gradient(135deg, #22c55e, #15803d)' : 'linear-gradient(135deg, #ef4444, #991b1b)',
              color: '#fff',
              fontSize: '18px',
              fontWeight: '900',
              cursor: 'pointer',
              boxShadow: `0 0 40px ${isGreen ? '#22c55e' : '#ef4444'}`,
              margin: '0 auto'
            }}
          >
            {isGreen ? 'DOKUN! 🟢' : 'BEKLE... 🔴'}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
