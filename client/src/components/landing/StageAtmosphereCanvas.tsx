import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  vx: number;
  vy: number;
  alpha: number;
  baseAlpha: number;
  pulseSpeed: number;
  pulseOffset: number;
  isBokeh: boolean;
  color: string;
}

export const StageAtmosphereCanvas: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let isVisible = true;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    // Support Retina displays
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Generate gold palette particles
    const particleColors = [
      'rgba(245, 238, 220, ', // Light cream gold
      'rgba(226, 190, 104, ', // Classic Étoile gold
      'rgba(202, 168, 104, ', // Warm gold
      'rgba(255, 247, 214, ', // Radiant white-gold
      'rgba(181, 131, 42, ',  // Deep antique gold
    ];

    const count = Math.min(Math.floor((width * height) / 22000), 55);
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const isBokeh = i % 8 === 0;
      const baseRadius = isBokeh ? 10 + Math.random() * 18 : 1 + Math.random() * 2.6;
      const baseAlpha = isBokeh ? 0.04 + Math.random() * 0.08 : 0.25 + Math.random() * 0.55;
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: baseRadius,
        baseRadius,
        vx: (Math.random() - 0.5) * (isBokeh ? 0.2 : 0.5),
        vy: -(0.25 + Math.random() * (isBokeh ? 0.35 : 0.75)),
        alpha: baseAlpha,
        baseAlpha,
        pulseSpeed: 0.015 + Math.random() * 0.025,
        pulseOffset: Math.random() * Math.PI * 2,
        isBokeh,
        color,
      });
    }

    // Pointer tracker for subtle organic drift
    const handlePointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const handlePointerLeave = () => {
      mouseRef.current.active = false;
    };

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener('mousemove', handlePointerMove);
      parent.addEventListener('mouseleave', handlePointerLeave);
    }

    // Pause when offscreen
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    }, { threshold: 0.05 });
    observer.observe(canvas);

    let time = 0;
    const render = () => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      time += 0.02;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Harmonic swaying motion
        p.x += p.vx + Math.sin(time + p.pulseOffset) * 0.3;
        p.y += p.vy;

        // Interactive mouse interaction (gentle gold dust repellent)
        if (mouseRef.current.active) {
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 130;
          if (dist < maxDist && dist > 0) {
            const force = (1 - dist / maxDist) * 1.5;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
          }
        }

        // Loop boundaries seamlessly
        if (p.y < -30) {
          p.y = height + 20;
          p.x = Math.random() * width;
        } else if (p.y > height + 30) {
          p.y = -20;
        }
        if (p.x < -30) p.x = width + 20;
        else if (p.x > width + 30) p.x = -20;

        // Glimmer pulsation
        const pulse = Math.sin(time * p.pulseSpeed * 60 + p.pulseOffset);
        p.alpha = Math.max(0.02, p.baseAlpha + pulse * (p.baseAlpha * 0.5));

        ctx.save();
        if (p.isBokeh) {
          // Soft out-of-focus golden bokeh glow
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
          grad.addColorStop(0, `${p.color}${p.alpha * 1.2})`);
          grad.addColorStop(0.5, `${p.color}${p.alpha * 0.5})`);
          grad.addColorStop(1, `${p.color}0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Star dust speck with diamond glow
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.8);
          glow.addColorStop(0, `${p.color}${p.alpha})`);
          glow.addColorStop(0.4, `${p.color}${p.alpha * 0.5})`);
          glow.addColorStop(1, `${p.color}0)`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.8, 0, Math.PI * 2);
          ctx.fill();

          // Bright pinpoint center
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, p.alpha * 1.4)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      observer.disconnect();
      if (parent) {
        parent.removeEventListener('mousemove', handlePointerMove);
        parent.removeEventListener('mouseleave', handlePointerLeave);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none z-10 ${className}`}
      aria-hidden="true"
    />
  );
};
