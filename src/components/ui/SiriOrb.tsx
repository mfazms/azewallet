'use client';

import { motion, Variants } from 'framer-motion';

interface SiriOrbProps {
  status?: 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
  size?: number;
}

export default function SiriOrb({ status = 'idle', size = 80 }: SiriOrbProps) {
  const orbVariants: Variants = {
    idle: {
      scale: [1, 1.05, 1],
      rotate: [0, 90, 180, 270, 360],
      transition: { duration: 10, repeat: Infinity, ease: 'linear' },
      opacity: 0.8,
    },
    listening: {
      scale: [1, 1.15, 1],
      rotate: [0, -90, -180, -270, -360],
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
      opacity: 1,
    },
    thinking: {
      scale: [1, 0.9, 1.1, 1],
      rotate: [0, 180, 360],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
      opacity: 0.9,
    },
    speaking: {
      scale: [1, 1.2, 0.9, 1.1, 1],
      rotate: [0, 45, 90, 135, 180, 225, 270, 315, 360],
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
      opacity: 1,
    },
  };

  const getColors = () => {
    switch (status) {
      case 'listening':
      case 'speaking':
        return ['#22d3ee', '#a855f7', '#3b82f6']; // cyan, purple, blue
      case 'thinking':
        return ['#60a5fa', '#6366f1', '#8b5cf6']; // blue, indigo, violet
      case 'idle':
      default:
        return ['rgba(59, 130, 246, 0.5)', 'rgba(168, 85, 247, 0.5)', 'rgba(34, 211, 238, 0.5)'];
    }
  };

  const colors = getColors();

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        margin: '0 auto',
      }}
    >
      <motion.div
        variants={orbVariants}
        animate={status}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          overflow: 'hidden',
          filter: 'blur(4px)',
          background: 'rgba(255, 255, 255, 0.15)',
        }}
      >
        <div style={{ position: 'absolute', top: '-25%', left: '-25%', width: '120%', height: '120%', borderRadius: '50%', mixBlendMode: 'screen', filter: 'blur(8px)', opacity: 0.9, background: colors[0], animation: 'blob 10s infinite alternate' }} />
        <div style={{ position: 'absolute', top: '-25%', right: '-25%', width: '120%', height: '120%', borderRadius: '50%', mixBlendMode: 'screen', filter: 'blur(8px)', opacity: 0.9, background: colors[1], animation: 'blob 10s infinite alternate 2s' }} />
        <div style={{ position: 'absolute', bottom: '-25%', left: '25%', width: '120%', height: '120%', borderRadius: '50%', mixBlendMode: 'screen', filter: 'blur(8px)', opacity: 0.9, background: colors[2], animation: 'blob 10s infinite alternate 4s' }} />
      </motion.div>

      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.2)', boxShadow: 'inset 0 0 15px rgba(255,255,255,0.1)' }} />
      <div style={{ position: 'absolute', width: '50%', height: '50%', borderRadius: '50%', filter: 'blur(4px)', background: 'rgba(255,255,255,0.6)' }} />
      <img src="/chatbot-logo.png" alt="Aze Intelligence" style={{ position: 'absolute', width: '55%', height: '55%', objectFit: 'contain', zIndex: 10, opacity: 0.95, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }} />
    </div>
  );
}
