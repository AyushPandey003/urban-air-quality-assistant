'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export function NearViewport({
  children,
  fallback,
  id,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  id?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const target = container.current;
    if (!target) return;
    if (typeof IntersectionObserver === 'undefined') {
      const frame = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: '120px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={container} id={id} className="h-full">
      {ready ? children : fallback}
    </div>
  );
}
