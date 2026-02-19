import React, { useEffect, useRef, useState } from 'react';
import { useSpring, animated } from '@react-spring/web';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  prefix = '',
  suffix = '',
  duration = 1500,
  decimals = 0,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const { number } = useSpring({
    from: { number: 0 },
    to: { number: isVisible ? value : 0 },
    config: { duration },
  });

  return (
    <animated.span
      ref={ref}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {number.to((n) => {
        const formatted = n.toFixed(decimals);
        const parts = formatted.split('.');
        parts[0] = Number(parts[0]).toLocaleString();
        return `${prefix}${parts.join('.')}${suffix}`;
      })}
    </animated.span>
  );
};

export default AnimatedCounter;
