import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';

export function Atmosphere({ reducedMotion }: { reducedMotion: boolean }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion || !container.current) return;
    let disposed = false;
    let game: Phaser.Game | undefined;

    // Let the background and first controls render before downloading the effects engine.
    const boot = window.setTimeout(() => {
      void import('phaser').then(({ default: P }) => {
        if (disposed || !container.current) return;
        class StudyAtmosphere extends P.Scene {
          motes: { dot: Phaser.GameObjects.Arc; x: number; y: number; speed: number; phase: number }[] = [];
          candleLights: Phaser.GameObjects.Image[] = [];
          create() {
            const texture = this.textures.createCanvas('warm-glow', 128, 128);
            if (texture) {
              const ctx = texture.getContext();
              const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
              gradient.addColorStop(0, 'rgba(255,180,63,0.28)');
              gradient.addColorStop(0.4, 'rgba(245,144,42,0.07)');
              gradient.addColorStop(1, 'rgba(255,142,31,0)');
              ctx.fillStyle = gradient;
              ctx.fillRect(0, 0, 128, 128);
              texture.refresh();
              for (let i = 0; i < 5; i++) this.candleLights.push(this.add.image(0, 0, 'warm-glow').setBlendMode(P.BlendModes.ADD));
            }
            for (let i = 0; i < 32; i++) {
              this.motes.push({ dot: this.add.circle(0, 0, P.Math.FloatBetween(0.5, 1.6), i % 4 ? 0xe4c78e : 0xb9c9e7, 0.3), x: Math.random(), y: Math.random(), speed: P.Math.FloatBetween(0.005, 0.02), phase: Math.random() * Math.PI * 2 });
            }
          }
          update(time: number, delta: number) {
            const { width, height } = this.scale;
            const elapsed = Math.min(delta, 50) / 1000;
            this.motes.forEach((mote) => {
              mote.y -= mote.speed * elapsed;
              if (mote.y < -0.02) mote.y = 1.02;
              mote.dot.setPosition(mote.x * width + Math.sin(time / 5500 + mote.phase) * 13, mote.y * height);
              mote.dot.setAlpha(0.16 + (Math.sin(time / 2600 + mote.phase) + 1) * 0.11);
            });
            const points = [[0.772, 0.401], [0.802, 0.37], [0.828, 0.307], [0.856, 0.365], [0.883, 0.406]];
            this.candleLights.forEach((light, i) => {
              light.setPosition(width * points[i][0], height * points[i][1]);
              light.setDisplaySize(width * 0.12, width * 0.12);
              light.setAlpha(0.65 + Math.sin(time / (120 + i * 13)) * 0.1 + Math.sin(time / 540) * 0.16);
            });
          }
        }
        try {
          game = new P.Game({
            type: P.AUTO, parent: container.current, transparent: true,
            scale: { mode: P.Scale.RESIZE, width: container.current.clientWidth, height: container.current.clientHeight },
            scene: StudyAtmosphere, banner: false,
            audio: { noAudio: true }, input: { keyboard: false, mouse: false, touch: false },
            fps: { target: 60, forceSetTimeOut: false },
            render: { antialias: true, powerPreference: 'low-power' },
          });
        } catch { /* Static artwork stays available if WebGL/Canvas is unavailable. */ }
      }).catch(() => undefined);
    }, 500);
    return () => { disposed = true; clearTimeout(boot); game?.destroy(true); };
  }, [reducedMotion]);

  return <div ref={container} className="atmosphere" aria-hidden="true" />;
}
