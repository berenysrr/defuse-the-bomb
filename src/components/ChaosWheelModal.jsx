import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Zap, Gift, Flame, Trophy } from 'lucide-react';
import { sounds } from '../utils/audio';

const CHAOS_EVENTS = [
  { id: 'SWAP_LIVES', title: '🔄 CANLARI TAKAS ET!', desc: 'En yüksek ve en düşük canlı oyuncunun canları değişti!', icon: RefreshCw, color: '#a855f7' },
  { id: 'SPEED_TURNS', title: '⚡ ŞİMŞEK TURU!', desc: 'Bombanın süresi 4 saniyeye düşürüldü! Tam panik!', icon: Zap, color: '#eab308' },
  { id: 'CARD_RAIN', title: '🎁 KART YAĞMURU!', desc: 'Her oyuncuya +1 ekstra aksiyon kartı hediye edildi!', icon: Gift, color: '#10b981' },
  { id: 'DOUBLE_WIRE', title: '💥 ÇİFTE KABLO!', desc: 'Sıradaki yanlış cevapta 2 kablo birden kesilecek!', icon: Flame, color: '#ef4444' }
];

export default function ChaosWheelModal({ isVisible, onComplete }) {
  const [spinning, setSpinning] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    if (isVisible) {
      setSpinning(true);
      setSelectedEvent(null);
      sounds.playBeep(1200, 0.2);

      const timer = setTimeout(() => {
        const randomEvent = CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)];
        setSelectedEvent(randomEvent);
        setSpinning(false);
        sounds.playBeep(1800, 0.4);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.9)',
        backdropFilter: 'blur(16px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <motion.div
          initial={{ scale: 0.3, opacity: 0, rotate: -15 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="glass-panel-modern"
          style={{
            padding: '36px',
            textAlign: 'center',
            maxWidth: '480px',
            width: '90%',
            border: `3px solid ${selectedEvent ? selectedEvent.color : '#f59e0b'}`,
            boxShadow: `0 0 60px ${selectedEvent ? selectedEvent.color : 'rgba(245,158,11,0.8)'}`,
            background: 'radial-gradient(circle, #0f172a 0%, #020617 100%)'
          }}
        >
          <h2 style={{ color: '#f59e0b', fontSize: '24px', letterSpacing: '2px', margin: '0 0 16px 0', textShadow: '0 0 15px rgba(245,158,11,0.5)' }}>
            🎡 KAOS ÇARKI DÖNÜYOR!
          </h2>

          {/* DÖNEN ÇARK SİMÜLASYONU */}
          <div style={{ margin: '24px auto', position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div
              animate={spinning ? { rotate: 1440 } : { rotate: 0 }}
              transition={{ duration: 2.5, ease: 'easeOut' }}
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                border: '6px dashed #f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 30px rgba(245,158,11,0.5)'
              }}
            >
              <RefreshCw size={48} color="#f59e0b" />
            </motion.div>
          </div>

          {/* SONUÇ AÇIKLAMASI */}
          {spinning ? (
            <p style={{ fontSize: '16px', color: '#cbd5e1', fontWeight: 'bold' }}>
              Şans çarkı dönüyor... Her an her şey değişebilir!
            </p>
          ) : (
            selectedEvent && (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <div style={{ fontSize: '22px', fontWeight: '900', color: selectedEvent.color, marginBottom: '10px' }}>
                  {selectedEvent.title}
                </div>
                <p style={{ fontSize: '15px', color: '#f8fafc', marginBottom: '24px', lineHeight: '1.4' }}>
                  {selectedEvent.desc}
                </p>
                <button
                  onClick={() => onComplete(selectedEvent)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    border: 'none',
                    background: selectedEvent.color,
                    color: '#ffffff',
                    cursor: 'pointer',
                    boxShadow: `0 8px 25px ${selectedEvent.color}80`
                  }}
                >
                  DEVAM ET ➔
                </button>
              </motion.div>
            )
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
