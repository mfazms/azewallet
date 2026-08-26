'use client';

import { useEffect, useRef, useState } from 'react';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}

export default function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  color = 'var(--color-income)',
  trackColor = 'var(--color-separator)',
  children,
}: ProgressRingProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const circleRef = useRef<SVGCircleElement>(null);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  // Determine color based on progress
  const getProgressColor = () => {
    if (progress >= 90) return 'var(--color-danger)';
    if (progress >= 75) return 'var(--color-warning)';
    return color;
  };

  useEffect(() => {
    // Animate from 0 to target
    const timer = setTimeout(() => {
      setAnimatedProgress(Math.min(100, progress));
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />

        {/* Fill */}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getProgressColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: 'stroke-dashoffset 1s cubic-bezier(0.25, 0.1, 0.25, 1), stroke 0.3s ease',
          }}
        />
      </svg>

      {/* Center content */}
      {children && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
