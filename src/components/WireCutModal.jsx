import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

export default function WireCutModal({ isVisible, wireColor, isExplosion, onClose }) {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(16px)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <motion.div
          initial={{ scale: 0.3, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="glass-panel"
          style={{
            padding: '40px',
            textAlign: 'center',
            maxWidth: '480px',
            width: '90%',
            border: `3px solid ${isExplosion ? '#ef4444' : '#22c55e'}`,
            boxShadow: `0 0 50px ${isExplosion ? 'rgba(239,68,68,0.7)' : 'rgba(34,197,94,0.7)'}`,
            background: 'radial-gradient(circle, rgba(15,23,42,0.95) 0%, rgba(2,6,23,0.98) 100%)'
          }}
        >
          {/* Makas Kesme Animasyonu */}
          <motion.div
            animate={{ rotate: [0, -25, 10, 0], scale: [1, 1.25, 1] }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            style={{ display: 'inline-block', marginBottom: '20px' }}
          >
            <Scissors size={72} color={wireColor || '#ef4444'} style={{ filter: `drop-shadow(0 0 20px ${wireColor || '#ef4444'})` }} />
          </motion.div>

          <h2 style={{ color: '#f8fafc', fontSize: '24px', letterSpacing: '2px', margin: '0 0 10px 0' }}>
            ✂️ KABLO KESİLİYOR...
          </h2>

          {/* Kesilen Kablo Görseli */}
          <div style={{ margin: '20px auto', height: '12px', width: '80%', borderRadius: '6px', background: wireColor || '#ef4444', boxShadow: `0 0 20px ${wireColor || '#ef4444'}` }} />

          {/* Sonuç Duyurusu */}
          {isExplosion ? (
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 0.4 }}
              style={{ color: '#ef4444', fontSize: '28px', fontWeight: '900', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <ShieldAlert size={32} /> GÜMM! PATLAMA! 💥
            </motion.div>
          ) : (
            <div style={{ color: '#22c55e', fontSize: '24px', fontWeight: 'bold', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <CheckCircle2 size={28} /> GÜVENLİ KABLO! 😮‍💨
            </div>
          )}

          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '16px' }}>
            {isExplosion ? 'Bomba senin elinde patladı ve 1 Can kaybettin!' : 'Derin bir nefes al... Şansına bu kablo güvenliydi!'}
          </p>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            style={{
              marginTop: '24px',
              padding: '12px 32px',
              fontSize: '15px',
              fontWeight: 'bold',
              borderRadius: '12px',
              border: 'none',
              background: isExplosion ? '#ef4444' : '#22c55e',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: `0 6px 20px ${isExplosion ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.5)'}`
            }}
          >
            DEVAM ET ➔
          </motion.button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
