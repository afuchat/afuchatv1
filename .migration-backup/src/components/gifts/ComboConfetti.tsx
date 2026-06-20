import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  char: string;
  size: number;
  gravity: number;
  alpha: number;
}

interface ComboConfettiProps {
  emojis: string[];
  giftCount: number;
  onComplete?: () => void;
}

export const ComboConfetti = ({ emojis, giftCount, onComplete }: ComboConfettiProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    // More particles for bigger combos
    const particleCount = 80 + (giftCount * 20);
    const colors = ['#ff6b9d', '#c44569', '#ffa502', '#ff6348', '#a29bfe', '#fd79a8', '#00d2d3', '#54a0ff'];
    const specialEmojis = ['✨', '🎉', '🎊', '💫', '⭐', '🌟', '💥', '🔥', '💖', ...emojis];

    // Create particles in multiple waves
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Main explosion
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const velocity = 4 + Math.random() * 7;
      
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - Math.random() * 4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        char: specialEmojis[Math.floor(Math.random() * specialEmojis.length)],
        size: 24 + Math.random() * 32,
        gravity: 0.12 + Math.random() * 0.08,
        alpha: 1,
      });
    }

    // Secondary explosions from corners
    const corners = [
      { x: canvas.width * 0.2, y: canvas.height * 0.3 },
      { x: canvas.width * 0.8, y: canvas.height * 0.3 },
    ];

    corners.forEach((corner) => {
      for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30;
        const velocity = 2 + Math.random() * 4;
        
        particles.push({
          x: corner.x,
          y: corner.y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity - Math.random() * 2,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          char: specialEmojis[Math.floor(Math.random() * specialEmojis.length)],
          size: 16 + Math.random() * 20,
          gravity: 0.1 + Math.random() * 0.05,
          alpha: 1,
        });
      }
    });

    let animationId: number;
    let frame = 0;
    const maxFrames = 240;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += particle.gravity;
        particle.rotation += particle.rotationSpeed;
        particle.vx *= 0.98;
        
        // Fade out near the end
        if (frame > maxFrames - 60) {
          particle.alpha = Math.max(0, particle.alpha - 0.02);
        }

        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.font = `${particle.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add glow effect
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 15;
        
        ctx.fillText(particle.char, 0, 0);
        ctx.restore();
      });

      frame++;
      if (frame < maxFrames) {
        animationId = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };

    // Add "COMBO!" text in the center
    const drawComboText = () => {
      const comboFrame = Math.min(frame, 60);
      const scale = Math.min(comboFrame / 20, 1);
      const alpha = frame < 120 ? 1 : Math.max(0, 1 - (frame - 120) / 60);
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(centerX, centerY - 100);
      ctx.scale(scale, scale);
      ctx.font = 'bold 80px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ff6b9d';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#ff6b9d';
      ctx.lineWidth = 4;
      ctx.strokeText('COMBO!', 0, 0);
      ctx.fillText('COMBO!', 0, 0);
      ctx.restore();
    };

    const animateWithText = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += particle.gravity;
        particle.rotation += particle.rotationSpeed;
        particle.vx *= 0.98;
        
        if (frame > maxFrames - 60) {
          particle.alpha = Math.max(0, particle.alpha - 0.02);
        }

        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.font = `${particle.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 15;
        ctx.fillText(particle.char, 0, 0);
        ctx.restore();
      });

      drawComboText();

      frame++;
      if (frame < maxFrames) {
        animationId = requestAnimationFrame(animateWithText);
      } else {
        onComplete?.();
      }
    };

    animateWithText();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [emojis, giftCount, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{ background: 'transparent' }}
    />
  );
};
