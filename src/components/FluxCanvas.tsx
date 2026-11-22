import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  AcousticPulse,
  ColorPalette,
  FieldNode,
  NodeKind,
  PointerImpulse,
  ProbeReading,
  SimulationParams,
  TelemetrySample,
  ToolMode,
} from '../types/flux';
import { evaluateField, evaluateProbe } from '../engine/fieldMath';

interface FluxCanvasProps {
  nodes: FieldNode[];
  params: SimulationParams;
  tool: ToolMode;
  isPlaying: boolean;
  stepTrigger: number;
  reseedTrigger: number;
  exportTrigger: number;
  acousticPulse: AcousticPulse | null;
  onAddNode: (kind: NodeKind, x: number, y: number) => string;
  onMoveNode: (id: string, x: number, y: number) => void;
  onRemoveNode: (id: string) => void;
  onTelemetrySample: (sample: TelemetrySample) => void;
  onFpsChange: (fps: number) => void;
  onExported: (dataUrl: string) => void;
}

const MAX_PARTICLES = 6000;
const PALETTE_BINS = 64;

function lerpRGB(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): string {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  return `rgb(${r},${g},${b})`;
}

function buildPaletteLookup(palette: ColorPalette): string[] {
  const colors: string[] = new Array(PALETTE_BINS);
  for (let i = 0; i < PALETTE_BINS; i++) {
    const t = i / (PALETTE_BINS - 1);
    if (palette === 'cyan') {
      if (t < 0.5) {
        colors[i] = lerpRGB([29, 78, 216], [6, 182, 212], t * 2);
      } else {
        colors[i] = lerpRGB([6, 182, 212], [224, 242, 254], (t - 0.5) * 2);
      }
    } else if (palette === 'amber') {
      if (t < 0.5) {
        colors[i] = lerpRGB([159, 18, 57], [245, 158, 11], t * 2);
      } else {
        colors[i] = lerpRGB([245, 158, 11], [254, 243, 199], (t - 0.5) * 2);
      }
    } else if (palette === 'viridis') {
      if (t < 0.35) {
        colors[i] = lerpRGB([68, 1, 84], [49, 104, 142], t / 0.35);
      } else if (t < 0.72) {
        colors[i] = lerpRGB([49, 104, 142], [53, 183, 121], (t - 0.35) / 0.37);
      } else {
        colors[i] = lerpRGB([53, 183, 121], [253, 231, 37], (t - 0.72) / 0.28);
      }
    } else {
      colors[i] = lerpRGB([100, 116, 139], [248, 250, 252], t);
    }
  }
  return colors;
}

export const FluxCanvas: React.FC<FluxCanvasProps> = ({
  nodes,
  params,
  tool,
  isPlaying,
  stepTrigger,
  reseedTrigger,
  exportTrigger,
  acousticPulse,
  onAddNode,
  onMoveNode,
  onRemoveNode,
  onTelemetrySample,
  onFpsChange,
  onExported,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heatCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mutable simulation refs for zero-overhead 60fps loop
  const nodesRef = useRef(nodes);
  const paramsRef = useRef(params);
  const isPlayingRef = useRef(isPlaying);
  const toolRef = useRef(tool);

  nodesRef.current = nodes;
  paramsRef.current = params;
  isPlayingRef.current = isPlaying;
  toolRef.current = tool;

  const pxRef = useRef(new Float32Array(MAX_PARTICLES));
  const pyRef = useRef(new Float32Array(MAX_PARTICLES));
  const ageRef = useRef(new Float32Array(MAX_PARTICLES));
  const lifeRef = useRef(new Float32Array(MAX_PARTICLES));

  const timeRef = useRef(0);
  const draggingNodeIdRef = useRef<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [cursorCoords, setCursorCoords] = useState<{ x: number; y: number } | null>(null);
  const [liveProbe, setLiveProbe] = useState<ProbeReading | null>(null);

  const pointerRef = useRef<PointerImpulse>({
    active: false,
    x: 0.5,
    y: 0.5,
    vx: 0,
    vy: 0,
    repel: false,
  });

  const wavesRef = useRef<
    Array<{
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      alpha: number;
      color: string;
      label: string;
    }>
  >([]);

  useEffect(() => {
    if (!acousticPulse) return;
    wavesRef.current.push({
      x: acousticPulse.x,
      y: acousticPulse.y,
      radius: 0.02,
      maxRadius: 0.55,
      alpha: 0.95,
      color: acousticPulse.color,
      label: acousticPulse.label,
    });
  }, [acousticPulse]);

  const paletteRef = useRef<string[]>(buildPaletteLookup(params.palette));
  useEffect(() => {
    paletteRef.current = buildPaletteLookup(params.palette);
  }, [params.palette]);

  const seedParticle = useCallback((i: number) => {
    pxRef.current[i] = Math.random();
    pyRef.current[i] = Math.random();
    ageRef.current[i] = Math.random() * 0.4;
    lifeRef.current[i] = 1.8 + Math.random() * 2.6;
  }, []);

  const seedAll = useCallback(() => {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      seedParticle(i);
      ageRef.current[i] = Math.random() * lifeRef.current[i];
    }
    const trail = trailCanvasRef.current;
    if (trail) {
      const tCtx = trail.getContext('2d');
      tCtx?.clearRect(0, 0, trail.width, trail.height);
    }
  }, [seedParticle]);

  // Initial seed
  useEffect(() => {
    seedAll();
  }, [seedAll]);

  // External reseed trigger
  useEffect(() => {
    if (reseedTrigger > 0) {
      seedAll();
    }
  }, [reseedTrigger, seedAll]);

  // External PNG export trigger
  useEffect(() => {
    if (exportTrigger > 0 && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onExported(dataUrl);
    }
  }, [exportTrigger, onExported]);

  // Step physics once
  const advancePhysics = useCallback(
    (dt: number, width: number, height: number) => {
      const p = paramsRef.current;
      const activeNodes = nodesRef.current;
      const aspect = Math.max(0.5, width / Math.max(1, height));
      const speedScale = dt * 0.22 * p.flowSpeed;

      timeRef.current += dt * p.flowSpeed;

      // Trail buffer decay & draw
      let trail = trailCanvasRef.current;
      if (!trail) {
        trail = document.createElement('canvas');
        trailCanvasRef.current = trail;
      }
      if (trail.width !== width || trail.height !== height) {
        trail.width = width;
        trail.height = height;
      }

      const tCtx = trail.getContext('2d');
      if (!tCtx) return;

      // Fade existing trails cleanly using destination-out
      const fadeAlpha = Math.max(0.015, 1 - p.trailPersistence);
      tCtx.save();
      tCtx.globalCompositeOperation = 'destination-out';
      tCtx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha.toFixed(3)})`;
      tCtx.fillRect(0, 0, width, height);
      tCtx.restore();

      const count = Math.min(MAX_PARTICLES, p.particleCount);
      const px = pxRef.current;
      const py = pyRef.current;
      const age = ageRef.current;
      const life = lifeRef.current;
      const colors = paletteRef.current;
      const pointer = pointerRef.current;

      let speedAccum = 0;
      let peakFlux = 0;

      if (p.showStreamlines) {
        tCtx.lineWidth = 1.45;
        tCtx.lineCap = 'round';
      }

      for (let i = 0; i < count; i++) {
        const x0 = px[i];
        const y0 = py[i];

        // RK2 Midpoint Integration
        const [v1x, v1y] = evaluateField(
          x0,
          y0,
          aspect,
          timeRef.current,
          activeNodes,
          p,
          pointer
        );
        const mx = x0 + 0.5 * speedScale * (v1x / aspect);
        const my = y0 + 0.5 * speedScale * v1y;
        const [v2x, v2y] = evaluateField(
          mx,
          my,
          aspect,
          timeRef.current,
          activeNodes,
          p,
          pointer
        );

        const mag = Math.hypot(v2x, v2y);
        speedAccum += mag;
        if (mag > peakFlux) peakFlux = mag;

        // Clamp velocity so singularities never teleport across screen in 1 frame
        const maxStepMag = 4.2;
        const clampFactor = mag > maxStepMag ? maxStepMag / mag : 1;
        let x1 = x0 + speedScale * ((v2x * clampFactor) / aspect);
        let y1 = y0 + speedScale * (v2y * clampFactor);

        // Apply active harmonic shockwave impulses near wavefront
        const waves = wavesRef.current;
        for (let w = 0; w < waves.length; w++) {
          const wave = waves[w];
          const dxW = (x0 - wave.x) * aspect;
          const dyW = y0 - wave.y;
          const distW = Math.hypot(dxW, dyW);
          const band = Math.abs(distW - wave.radius);
          if (band < 0.05 && distW > 0.001) {
            const waveKick = (1 - band / 0.05) * wave.alpha * dt * 0.65;
            x1 += ((dxW / distW) * waveKick) / aspect;
            y1 += (dyW / distW) * waveKick;
          }
        }

        age[i] += dt;

        // Check sink core capture so particles don't bunch infinitely
        let captured = false;
        for (let n = 0; n < activeNodes.length; n++) {
          if (activeNodes[n].type === 'sink') {
            const dx = (x1 - activeNodes[n].x) * aspect;
            const dy = y1 - activeNodes[n].y;
            if (dx * dx + dy * dy < 0.00022) {
              captured = true;
              break;
            }
          }
        }

        const outOfBounds = x1 < -0.01 || x1 > 1.01 || y1 < -0.01 || y1 > 1.01;
        if (outOfBounds || captured || age[i] >= life[i]) {
          seedParticle(i);
          continue;
        }

        if (p.showStreamlines) {
          const normMag = Math.min(1, mag / 2.6);
          const colorIdx = Math.min(PALETTE_BINS - 1, Math.floor(normMag * (PALETTE_BINS - 1)));
          tCtx.strokeStyle = colors[colorIdx];
          tCtx.beginPath();
          tCtx.moveTo(x0 * width, y0 * height);
          tCtx.lineTo(x1 * width, y1 * height);
          tCtx.stroke();
        }

        px[i] = x1;
        py[i] = y1;
      }

      // Decay pointer impulse velocity slightly between frames
      pointer.vx *= 0.82;
      pointer.vy *= 0.82;

      // Advance harmonic shockwaves
      const waves = wavesRef.current;
      for (let w = waves.length - 1; w >= 0; w--) {
        waves[w].radius += dt * 0.55;
        waves[w].alpha = Math.max(0, 1 - waves[w].radius / waves[w].maxRadius);
        if (waves[w].alpha <= 0.01) {
          waves.splice(w, 1);
        }
      }

      return {
        meanSpeed: count > 0 ? speedAccum / count : 0,
        peakFlux,
      };
    },
    [seedParticle]
  );

  // Render full frame onto display canvas
  const renderFrame = useCallback((width: number, height: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const p = paramsRef.current;
    const activeNodes = nodesRef.current;
    const aspect = Math.max(0.5, width / Math.max(1, height));

    // 1. Base obsidian background
    ctx.fillStyle = '#07090E';
    ctx.fillRect(0, 0, width, height);

    // 2. Optional Scalar Magnitude Heatmap
    if (p.showHeatmap) {
      let heat = heatCanvasRef.current;
      if (!heat) {
        heat = document.createElement('canvas');
        heat.width = 64;
        heat.height = 40;
        heatCanvasRef.current = heat;
      }
      const hCtx = heat.getContext('2d');
      if (hCtx) {
        const img = hCtx.createImageData(heat.width, heat.height);
        const data = img.data;
        for (let gy = 0; gy < heat.height; gy++) {
          const ny = (gy + 0.5) / heat.height;
          for (let gx = 0; gx < heat.width; gx++) {
            const nx = (gx + 0.5) / heat.width;
            const [fx, fy] = evaluateField(
              nx,
              ny,
              aspect,
              timeRef.current,
              activeNodes,
              p
            );
            const mag = Math.min(1, Math.hypot(fx, fy) / 2.8);
            const idx = (gy * heat.width + gx) * 4;
            if (p.palette === 'amber') {
              data[idx] = Math.round(14 + mag * 190);
              data[idx + 1] = Math.round(12 + mag * 90);
              data[idx + 2] = Math.round(24 + mag * 20);
            } else {
              data[idx] = Math.round(8 + mag * 14);
              data[idx + 1] = Math.round(18 + mag * 140);
              data[idx + 2] = Math.round(38 + mag * 165);
            }
            data[idx + 3] = Math.round(30 + mag * 135);
          }
        }
        hCtx.putImageData(img, 0, 0);
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(heat, 0, 0, width, height);
        ctx.restore();
      }
    }

    // 3. Subtle calibrated coordinate grid
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
    ctx.lineWidth = 1;
    const cols = 10;
    const rows = 6;
    for (let c = 1; c < cols; c++) {
      const x = Math.round((c / cols) * width) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let r = 1; r < rows; r++) {
      const y = Math.round((r / rows) * height) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Composite particle streamline trails
    const trail = trailCanvasRef.current;
    if (trail && p.showStreamlines) {
      ctx.drawImage(trail, 0, 0, width, height);
    }

    // 5. Optional Vector Grid Arrows
    if (p.showVectors) {
      const gridX = 26;
      const gridY = 16;
      const stepX = width / gridX;
      const stepY = height / gridY;
      ctx.save();
      ctx.lineWidth = 1.15;

      for (let gy = 0; gy < gridY; gy++) {
        const ny = (gy + 0.5) / gridY;
        const cy = (gy + 0.5) * stepY;
        for (let gx = 0; gx < gridX; gx++) {
          const nx = (gx + 0.5) / gridX;
          const cx = (gx + 0.5) * stepX;

          const [fx, fy] = evaluateField(
            nx,
            ny,
            aspect,
            timeRef.current,
            activeNodes,
            p
          );
          const mag = Math.hypot(fx, fy);
          if (mag < 0.001) continue;

          const ux = fx / mag;
          const uy = fy / mag;
          const normMag = Math.min(1, mag / 2.4);
          const len = 8 + normMag * 12;

          const ex = cx + ux * len;
          const ey = cy + uy * len;

          ctx.strokeStyle = `rgba(148, 163, 184, ${0.28 + normMag * 0.55})`;
          ctx.beginPath();
          ctx.moveTo(cx - ux * len * 0.35, cy - uy * len * 0.35);
          ctx.lineTo(ex, ey);
          // Arrowhead
          const head = 4;
          const ang = Math.atan2(uy, ux);
          ctx.lineTo(ex - head * Math.cos(ang - 0.55), ey - head * Math.sin(ang - 0.55));
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - head * Math.cos(ang + 0.55), ey - head * Math.sin(ang + 0.55));
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 6. Active Stir Brush Ring
    if (pointerRef.current.active && toolRef.current === 'stir') {
      const bx = pointerRef.current.x * width;
      const by = pointerRef.current.y * height;
      ctx.save();
      ctx.strokeStyle = pointerRef.current.repel
        ? 'rgba(244, 63, 94, 0.55)'
        : 'rgba(34, 211, 238, 0.55)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(bx, by, Math.min(width, height) * 0.09, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 7. Placed Field Nodes Overlay
    if (p.showNodes) {
      ctx.save();
      for (let i = 0; i < activeNodes.length; i++) {
        const node = activeNodes[i];
        const cx = node.x * width;
        const cy = node.y * height;
        const isHovered =
          draggingNodeIdRef.current === node.id || hoveredNodeId === node.id;

        let accent = '#06B6D4';
        let symbol = '+';
        if (node.type === 'sink') {
          accent = '#F43F5E';
          symbol = '−';
        } else if (node.type === 'vortex-cw') {
          accent = '#F59E0B';
          symbol = '↻';
        } else if (node.type === 'vortex-ccw') {
          accent = '#38BDF8';
          symbol = '↺';
        }

        // Outer influence halo
        ctx.strokeStyle = isHovered ? accent : `${accent}66`;
        ctx.lineWidth = isHovered ? 1.75 : 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 18 + node.strength * 4, 0, Math.PI * 2);
        ctx.stroke();

        // Core disc
        ctx.fillStyle = '#0B0F17';
        ctx.beginPath();
        ctx.arc(cx, cy, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Glyph
        ctx.fillStyle = accent;
        ctx.font = '600 13px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, cx, cy + 0.5);

        // Node label below
        ctx.fillStyle = '#94A3B8';
        ctx.font = '500 10px "IBM Plex Mono", monospace';
        ctx.fillText(`${node.label} (${node.strength.toFixed(1)})`, cx, cy + 28);
      }
      ctx.restore();
    }

    // 8. Expanding Acoustic Harmonic Shockwaves
    if (wavesRef.current.length > 0) {
      ctx.save();
      const minDim = Math.min(width, height);
      for (let w = 0; w < wavesRef.current.length; w++) {
        const wave = wavesRef.current[w];
        const wx = wave.x * width;
        const wy = wave.y * height;
        const wr = wave.radius * minDim;
        ctx.globalAlpha = wave.alpha * 0.85;
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = 1.75;
        ctx.beginPath();
        ctx.arc(wx, wy, wr, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = wave.alpha * 0.7;
        ctx.fillStyle = wave.color;
        ctx.font = '500 10px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(wave.label, wx, wy - wr - 6);
      }
      ctx.restore();
    }
  }, [hoveredNodeId]);

  // Step trigger when paused
  useEffect(() => {
    if (stepTrigger > 0 && !isPlayingRef.current && canvasRef.current) {
      advancePhysics(0.032, canvasRef.current.width, canvasRef.current.height);
      renderFrame(canvasRef.current.width, canvasRef.current.height);
    }
  }, [stepTrigger, advancePhysics, renderFrame]);

  // Resize observer + main animation loop
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width));
      const h = Math.max(320, Math.floor(rect.height));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);

    let rafId = 0;
    let lastTime = performance.now();
    let fpsFrames = 0;
    let fpsWindowStart = lastTime;
    let telemetryTimer = 0;

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(0.04, Math.max(0.004, rawDt));

      fpsFrames++;
      if (now - fpsWindowStart >= 500) {
        const currentFps = Math.round((fpsFrames * 1000) / (now - fpsWindowStart));
        onFpsChange(currentFps);
        fpsFrames = 0;
        fpsWindowStart = now;
      }

      if (isPlayingRef.current) {
        const stats = advancePhysics(dt, canvas.width, canvas.height);
        telemetryTimer += dt;
        if (stats && telemetryTimer >= 0.14) {
          telemetryTimer = 0;
          // Sample spatial vorticity (mean |curl|) across 6x4 lattice
          const aspect = Math.max(0.5, canvas.width / Math.max(1, canvas.height));
          let curlSum = 0;
          const samplesX = 6;
          const samplesY = 4;
          for (let gy = 0; gy < samplesY; gy++) {
            const ny = (gy + 0.5) / samplesY;
            for (let gx = 0; gx < samplesX; gx++) {
              const nx = (gx + 0.5) / samplesX;
              const pr = evaluateProbe(
                nx,
                ny,
                aspect,
                timeRef.current,
                nodesRef.current,
                paramsRef.current
              );
              curlSum += Math.abs(pr.curl);
            }
          }
          const meanCurl = curlSum / (samplesX * samplesY);
          const energy = 0.5 * stats.meanSpeed * stats.meanSpeed;
          onTelemetrySample({
            t: timeRef.current,
            meanSpeed: stats.meanSpeed,
            peakFlux: stats.peakFlux,
            meanCurl,
            energy,
          });
        }
      }

      renderFrame(canvas.width, canvas.height);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [advancePhysics, renderFrame, onFpsChange, onTelemetrySample]);

  // Pointer helpers
  const getNormalizedCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const ny = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    return { nx, ny, width: rect.width, height: rect.height };
  };

  const findNodeAt = (nx: number, ny: number, width: number, height: number): FieldNode | null => {
    const hitRadiusPx = 22;
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const n = nodesRef.current[i];
      const dx = (nx - n.x) * width;
      const dy = (ny - n.y) * height;
      if (dx * dx + dy * dy <= hitRadiusPx * hitRadiusPx) {
        return n;
      }
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { nx, ny, width, height } = getNormalizedCoords(e);
    e.currentTarget.setPointerCapture(e.pointerId);

    const hit = findNodeAt(nx, ny, width, height);
    if (e.button === 2 || (e.altKey && hit)) {
      if (hit) onRemoveNode(hit.id);
      return;
    }

    if (hit && paramsRef.current.showNodes) {
      draggingNodeIdRef.current = hit.id;
      return;
    }

    const activeTool = toolRef.current;
    if (
      activeTool === 'source' ||
      activeTool === 'sink' ||
      activeTool === 'vortex-cw' ||
      activeTool === 'vortex-ccw'
    ) {
      const newId = onAddNode(activeTool, nx, ny);
      draggingNodeIdRef.current = newId;
      return;
    }

    if (activeTool === 'stir') {
      pointerRef.current.active = true;
      pointerRef.current.x = nx;
      pointerRef.current.y = ny;
      pointerRef.current.vx = 0;
      pointerRef.current.vy = 0;
      pointerRef.current.repel = e.shiftKey;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { nx, ny, width, height } = getNormalizedCoords(e);
    setCursorCoords({ x: nx, y: ny });

    const aspect = Math.max(0.5, width / Math.max(1, height));
    const reading = evaluateProbe(
      nx,
      ny,
      aspect,
      timeRef.current,
      nodesRef.current,
      paramsRef.current
    );
    setLiveProbe(reading);

    if (draggingNodeIdRef.current) {
      onMoveNode(draggingNodeIdRef.current, nx, ny);
      return;
    }

    if (pointerRef.current.active && toolRef.current === 'stir') {
      const dx = nx - pointerRef.current.x;
      const dy = ny - pointerRef.current.y;
      pointerRef.current.vx = dx;
      pointerRef.current.vy = dy;
      pointerRef.current.x = nx;
      pointerRef.current.y = ny;
      pointerRef.current.repel = e.shiftKey;
      return;
    }

    const hit = paramsRef.current.showNodes ? findNodeAt(nx, ny, width, height) : null;
    setHoveredNodeId(hit ? hit.id : null);
  };

  const handlePointerUp = () => {
    draggingNodeIdRef.current = null;
    pointerRef.current.active = false;
    pointerRef.current.vx = 0;
    pointerRef.current.vy = 0;
  };

  const handlePointerLeave = () => {
    draggingNodeIdRef.current = null;
    pointerRef.current.active = false;
    setHoveredNodeId(null);
    setCursorCoords(null);
    setLiveProbe(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-h-[400px] lg:min-h-[480px] bg-[#07090E] overflow-hidden select-none"
    >
      <canvas
        ref={canvasRef}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className={`block w-full h-full touch-none ${
          hoveredNodeId ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
        }`}
      />

      {/* Corner Probe Coordinate HUD */}
      <div className="pointer-events-none absolute top-3 left-3 flex flex-col gap-1 bg-[#07090E]/80 backdrop-blur-sm border border-[#1E293B] px-3 py-2 rounded">
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span>
            X:{' '}
            <span className="text-slate-200">
              {cursorCoords ? cursorCoords.x.toFixed(3) : '—'}
            </span>
          </span>
          <span>
            Y:{' '}
            <span className="text-slate-200">
              {cursorCoords ? cursorCoords.y.toFixed(3) : '—'}
            </span>
          </span>
          <span className="text-slate-600">|</span>
          <span>
            |F|:{' '}
            <span className="text-cyan-400">
              {liveProbe ? liveProbe.magnitude.toFixed(2) : '—'}
            </span>
          </span>
          <span>
            θ:{' '}
            <span className="text-slate-200">
              {liveProbe ? `${liveProbe.angleDeg.toFixed(0)}°` : '—'}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span>
            ∇·F:{' '}
            <span className="text-slate-200">
              {liveProbe
                ? `${liveProbe.divergence >= 0 ? '+' : ''}${liveProbe.divergence.toFixed(2)}`
                : '—'}
            </span>
          </span>
          <span>
            ∇×F:{' '}
            <span className="text-amber-400">
              {liveProbe
                ? `${liveProbe.curl >= 0 ? '+' : ''}${liveProbe.curl.toFixed(2)}`
                : '—'}
            </span>
          </span>
        </div>
      </div>

      {/* Bottom-right subtle interaction hint */}
      <div className="pointer-events-none absolute bottom-3 right-3 bg-[#07090E]/75 border border-[#1E293B] px-2.5 py-1 rounded text-[11px] text-slate-400">
        {tool === 'stir' && 'Drag to stir fluid · Shift+Drag to repel · Drag nodes to move'}
        {tool === 'probe' && 'Hover stage to sample local divergence and curl operators'}
        {(tool === 'source' ||
          tool === 'sink' ||
          tool === 'vortex-cw' ||
          tool === 'vortex-ccw') &&
          'Click stage to place node · Drag to position · Right-click to remove'}
      </div>
    </div>
  );
};
