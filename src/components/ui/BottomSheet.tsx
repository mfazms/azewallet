'use client';

import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useEffect, useRef, useState, ReactNode } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  snapPoints?: number[];
}

export default function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [0.92],
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const [windowHeight, setWindowHeight] = useState(0);

  useEffect(() => {
    setWindowHeight(window.innerHeight);
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sheetHeight = windowHeight * (snapPoints[0] || 0.92);
  const opacity = useTransform(y, [0, sheetHeight], [1, 0]);
  const overlayOpacity = useTransform(y, [0, sheetHeight], [0.4, 0]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.velocity.y > 500 || info.offset.y > sheetHeight * 0.3) {
      onClose();
    }
  };

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ opacity: overlayOpacity }}
        onClick={onClose}
        className="bottom-sheet-overlay"
        aria-hidden="true"
      />

      {/* Sheet */}
      <motion.div
        ref={sheetRef}
        initial={{ y: sheetHeight }}
        animate={{ y: 0 }}
        exit={{ y: sheetHeight }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
        drag="y"
        dragConstraints={{ top: 0, bottom: sheetHeight }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ y, opacity, height: sheetHeight }}
        className="bottom-sheet"
      >
        {/* Handle */}
        <div className="bottom-sheet-handle-area">
          <div className="bottom-sheet-handle" />
        </div>

        {/* Title */}
        {title && (
          <div className="bottom-sheet-header">
            <h3 className="text-h3">{title}</h3>
          </div>
        )}

        {/* Content */}
        <div className="bottom-sheet-content">
          {children}
        </div>
      </motion.div>

      
    </>
  );
}
