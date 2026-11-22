import {
  FieldMode,
  FieldNode,
  FieldPreset,
  PointerImpulse,
  ProbeReading,
  SimulationParams,
} from '../types/flux';
import { sampleCurlField } from './noise';

export const DEFAULT_PARAMS: SimulationParams = {
  particleCount: 2800,
  flowSpeed: 1.0,
  trailPersistence: 0.91,
  turbulenceIntensity: 0.75,
  turbulenceScale: 1.6,
  streamFlow: 0.25,
  showStreamlines: true,
  showVectors: false,
  showHeatmap: false,
  showNodes: true,
  palette: 'cyan',
};

export const FIELD_PRESETS: Record<FieldMode, FieldPreset> = {
  sandbox: {
    id: 'sandbox',
    title: 'Coupled Dipole & Shear',
    subtitle: 'Mixed radial singularities paired with rotational eddy currents and curl noise.',
    equation: 'F(r,t) = Σ qᵢ·(r−rᵢ)/(|r−rᵢ|²+ε) + Σ Γᵢ×(r−rᵢ) + κ·(∇×ψ) + U₀',
    nodes: [
      { id: 'n-1', type: 'source', x: 0.3, y: 0.5, strength: 1.3, label: '+Q₁' },
      { id: 'n-2', type: 'vortex-cw', x: 0.54, y: 0.36, strength: 1.4, label: 'Ω₁' },
      { id: 'n-3', type: 'sink', x: 0.74, y: 0.56, strength: 1.25, label: '−Q₂' },
    ],
    params: {
      turbulenceIntensity: 0.65,
      turbulenceScale: 1.5,
      streamFlow: 0.28,
      flowSpeed: 1.0,
      trailPersistence: 0.91,
    },
  },
  magnetics: {
    id: 'magnetics',
    title: 'Quadrupole Magnetic Trap',
    subtitle: 'Alternating positive and negative poles forming closed hyperbolic flux lines.',
    equation: 'E(r) = Σ (qᵢ / 2πε₀) · (r − rᵢ) / (|r − rᵢ|² + a²)',
    nodes: [
      { id: 'm-1', type: 'source', x: 0.34, y: 0.34, strength: 1.6, label: '+N₁' },
      { id: 'm-2', type: 'sink', x: 0.66, y: 0.34, strength: 1.6, label: '−S₁' },
      { id: 'm-3', type: 'sink', x: 0.34, y: 0.66, strength: 1.6, label: '−S₂' },
      { id: 'm-4', type: 'source', x: 0.66, y: 0.66, strength: 1.6, label: '+N₂' },
    ],
    params: {
      turbulenceIntensity: 0.08,
      turbulenceScale: 1.2,
      streamFlow: 0.0,
      flowSpeed: 1.15,
      trailPersistence: 0.93,
    },
  },
  vortex: {
    id: 'vortex',
    title: 'Karman Vortex Street',
    subtitle: 'Counter-rotating Biot-Savart vortices shedding in a steady cross-stream.',
    equation: 'u(r) = U₀ î + Σ (Γᵢ / 2π) · [ẑ × (r − rᵢ)] / (|r − rᵢ|² + r_c²)',
    nodes: [
      { id: 'v-1', type: 'vortex-ccw', x: 0.32, y: 0.42, strength: 1.7, label: '↺₁' },
      { id: 'v-2', type: 'vortex-cw', x: 0.48, y: 0.6, strength: 1.7, label: '↻₂' },
      { id: 'v-3', type: 'vortex-ccw', x: 0.66, y: 0.41, strength: 1.5, label: '↺₃' },
    ],
    params: {
      turbulenceIntensity: 0.18,
      turbulenceScale: 1.8,
      streamFlow: 0.65,
      flowSpeed: 1.05,
      trailPersistence: 0.92,
    },
  },
  turbulence: {
    id: 'turbulence',
    title: 'Incompressible Curl Cascade',
    subtitle: 'Divergence-free multi-octave streamfunction turbulence (∇ · u = 0).',
    equation: 'u(x,y,t) = ∇ × ψ(x,y,t) = (∂ψ/∂y, −∂ψ/∂x),  ∇·u ≡ 0',
    nodes: [],
    params: {
      turbulenceIntensity: 1.85,
      turbulenceScale: 2.1,
      streamFlow: 0.1,
      flowSpeed: 1.0,
      trailPersistence: 0.9,
    },
  },
};

/**
 * Evaluates the 2D vector field (fx, fy) in normalized domain coordinates [0, 1] x [0, 1].
 * Aspect ratio is accounted for so radial singularities stay circular.
 */
export function evaluateField(
  nx: number,
  ny: number,
  aspect: number,
  time: number,
  nodes: FieldNode[],
  params: SimulationParams,
  pointer?: PointerImpulse
): [number, number] {
  let fx = params.streamFlow;
  let fy = 0;

  // 1. Curl-noise turbulence component
  if (params.turbulenceIntensity > 0.001) {
    const [cx, cy] = sampleCurlField(nx * aspect, ny, time, params.turbulenceScale);
    fx += cx * params.turbulenceIntensity;
    fy += cy * params.turbulenceIntensity;
  }

  // 2. Singularity & vortex node contributions
  const softening = 0.0032; // Regularized core radius squared
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const dx = (nx - node.x) * aspect;
    const dy = ny - node.y;
    const distSq = dx * dx + dy * dy + softening;
    const scale = (node.strength * 0.042) / distSq;

    if (node.type === 'source') {
      fx += dx * scale;
      fy += dy * scale;
    } else if (node.type === 'sink') {
      fx -= dx * scale;
      fy -= dy * scale;
    } else if (node.type === 'vortex-cw') {
      // Clockwise in screen coords (+y down): (-dy, dx) or (dy, -dx)?
      // Wait: if +x right, +y down: (0, -1) top -> clockwise moves right (+1, 0) => (-dy, dx)
      fx -= dy * scale * 1.35;
      fy += dx * scale * 1.35;
    } else if (node.type === 'vortex-ccw') {
      fx += dy * scale * 1.35;
      fy -= dx * scale * 1.35;
    }
  }

  // 3. Interactive cursor brush impulse
  if (pointer && pointer.active) {
    const dx = (nx - pointer.x) * aspect;
    const dy = ny - pointer.y;
    const distSq = dx * dx + dy * dy;
    const radiusSq = 0.045;
    if (distSq < radiusSq) {
      const falloff = Math.exp(-distSq / 0.012);
      // Add drag momentum
      fx += pointer.vx * falloff * 18;
      fy += pointer.vy * falloff * 18;
      // Add radial attraction or repulsion
      const radialGain = pointer.repel ? 1.8 : -1.4;
      const rNorm = Math.sqrt(distSq) + 0.02;
      fx += (dx / rNorm) * radialGain * falloff;
      fy += (dy / rNorm) * radialGain * falloff;
    }
  }

  return [fx, fy];
}

/**
 * Computes differential field probe diagnostics at a normalized coordinate.
 */
export function evaluateProbe(
  nx: number,
  ny: number,
  aspect: number,
  time: number,
  nodes: FieldNode[],
  params: SimulationParams
): ProbeReading {
  const [fx, fy] = evaluateField(nx, ny, aspect, time, nodes, params);
  const magnitude = Math.hypot(fx, fy);
  const angleDeg = ((Math.atan2(fy, fx) * 180) / Math.PI + 360) % 360;

  const h = 0.005;
  const [fxR, fyR] = evaluateField(nx + h / aspect, ny, aspect, time, nodes, params);
  const [fxL, fyL] = evaluateField(nx - h / aspect, ny, aspect, time, nodes, params);
  const [fxD, fyD] = evaluateField(nx, ny + h, aspect, time, nodes, params);
  const [fxU, fyU] = evaluateField(nx, ny - h, aspect, time, nodes, params);

  const dFxdX = (fxR - fxL) / (2 * h);
  const dFydY = (fyD - fyU) / (2 * h);
  const dFydX = (fyR - fyL) / (2 * h);
  const dFxdY = (fxD - fxU) / (2 * h);

  const divergence = dFxdX + dFydY;
  const curl = dFydX - dFxdY;

  return {
    x: nx,
    y: ny,
    fx,
    fy,
    magnitude,
    angleDeg,
    divergence,
    curl,
  };
}
