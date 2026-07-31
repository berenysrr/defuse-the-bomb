import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Target } from 'lucide-react';

export default function TargetPlayerModal({ isVisible, card, opponents, onSelectTarget, onClose }) {
  if (!isVisible || !card) return null;

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.88)',
        backdropFilter: 'blur(16px)',
        zIndex: 180,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="glass-panel-modern"
          style={{
            padding: '30px',
            textAlign: 'center',
            maxWidth: '460px',
            width: '90%',
            border: '2px solid #ef4444',
            boxShadow: '0 0 50px rgba(239, 68, 68, 0.6)',
            background: 'radial-gradient(circle, #0f172a 0%, #020617 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#ef4444', marginBottom: '10px' }}>
            <Crosshair size={28} />
            <h2 style={{ margin: 0, fontSize: '20px', letterSpacing: '1px' }}>🎯 HEDEF RAKİBİ SEÇ!</h2>
          </div>

          <p style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '20px' }}>
            <strong style={{ color: '#f59e0b' }}>{card.name}</strong> kartını hangi rakibine fırlatmak istiyorsun?
          </p>

          {/* RAKİP SEÇİM BUTONLARI */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {opponents.map(p => (
              <motion.button
                key={p.id}
                whileHover={{ scale: 1.03, backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444' }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onSelectTarget(p)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1.5px solid rgba(255,255,255,0.15)',
                  background: '#1e293b',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>{p.avatar?.icon}</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{p.name}</span>
                </div>

                <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{Array.from({ length: p.lives }).map((_, i) => '❤️').join('')}</span>
                  <Target size={14} />
                </div>
              </motion.button>
            ))}
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: '#334155',
              color: '#94a3b8',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            İPTAL
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
