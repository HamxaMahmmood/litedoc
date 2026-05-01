'use client';

import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { ModelConfig } from '@/types/model';
import { Maximize2, X, Play, Pause, RotateCcw } from 'lucide-react';

// ─── CKA Graph Component ──────────────────────────────────────────────────────
function CKAGraph({ layerIndex, expertCount, onClose }: {
  layerIndex: number;
  expertCount: number;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const N = 64;
    const size = 260;
    canvas.width = size;
    canvas.height = size;
    const cell = size / N;

    const seed = layerIndex * 137 + 42;
    const rand = (i: number, j: number) => {
      const s = seed + i * 71 + j * 31;
      return Math.abs((Math.sin(s) * 43758.5453) % 1);
    };

    const numClusters = Math.max(2, 8 - Math.floor(layerIndex * 0.6));
    const clusterOf = Array.from({ length: N }, (_, i) =>
      Math.floor(rand(i, 0) * numClusters)
    );

    // Build symmetric matrix — compute upper triangle, mirror to lower
    const vals: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
    for (let i = 0; i < N; i++) {
      vals[i][i] = 1.0;
      for (let j = i + 1; j < N; j++) {
        const v = clusterOf[i] === clusterOf[j]
          ? 0.65 + rand(i, j) * 0.3
          : 0.20 + rand(i, j) * 0.35;
        vals[i][j] = v;
        vals[j][i] = v; // symmetric
      }
    }

    // Draw full 64×64 viridis matrix — identical for all models
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const t = vals[i][j];
        if (i === j) {
          ctx.fillStyle = `rgb(253,231,37)`;
        } else {
          let r: number, g: number, b: number;
          if (t < 0.33) {
            const f = t / 0.33;
            r = Math.floor(68 * (1 - f));
            g = Math.floor(1 * (1 - f) + 128 * f);
            b = Math.floor(84 * (1 - f) + 128 * f);
          } else if (t < 0.66) {
            const f = (t - 0.33) / 0.33;
            r = Math.floor(50 * f);
            g = Math.floor(128 * (1 - f) + 200 * f);
            b = Math.floor(128 * (1 - f) + 80 * f);
          } else {
            const f = (t - 0.66) / 0.34;
            r = Math.floor(50 * (1 - f) + 253 * f);
            g = Math.floor(200 * (1 - f) + 231 * f);
            b = Math.floor(80 * (1 - f) + 37 * f);
          }
          ctx.fillStyle = `rgb(${r!},${g!},${b!})`;
        }
        ctx.fillRect(j * cell, i * cell, cell, cell);
      }
    }

    // Red X markers on high-similarity pairs
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (i !== j && vals[i][j] > 0.7 && rand(i + 10, j + 10) > 0.55) {
          ctx.strokeStyle = 'rgba(255,50,50,0.9)';
          ctx.lineWidth = 1.2;
          const cx = j * cell + cell / 2;
          const cy = i * cell + cell / 2;
          const r2 = cell * 0.35;
          ctx.beginPath();
          ctx.moveTo(cx - r2, cy - r2); ctx.lineTo(cx + r2, cy + r2);
          ctx.moveTo(cx + r2, cy - r2); ctx.lineTo(cx - r2, cy + r2);
          ctx.stroke();
        }
      }
    }

    // Re-draw diagonal in yellow on top
    for (let i = 0; i < N; i++) {
      ctx.fillStyle = 'rgb(253,231,37)';
      ctx.fillRect(i * cell, i * cell, cell, cell);
    }

    // Axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('0', 2, 10);
    ctx.fillText('63', size - 18, 10);
  }, [layerIndex, expertCount]);

  return (
    <div style={{
      position: 'absolute',
      background: 'rgba(8,12,24,0.97)',
      border: '1px solid rgba(56,189,248,0.3)',
      borderRadius: 12,
      padding: 14,
      zIndex: 100,
      backdropFilter: 'blur(16px)',
      boxShadow: '0 0 40px rgba(56,189,248,0.15)',
      minWidth: 300,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ color: '#38bdf8', fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase' }}>
            CKA Similarity Matrix
          </div>
          <div style={{ color: '#e2e8f0', fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>
            Layer {layerIndex} · 64 × 64 experts · τ = 0.70
          </div>
          <div style={{ color: '#a3e635', fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>
            Retained: {expertCount} / 64
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer', padding: 4 }}>
          <X size={14} />
        </button>
      </div>
      <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 6, width: 260, height: 260 }} />
      <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 9, fontFamily: 'monospace', color: '#e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 20, height: 8, background: 'linear-gradient(to right, #44015480, #21908c80, #fde72580)', borderRadius: 2 }} />
          <span>0.3 → 1.0 similarity</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#ef4444' }}>✕</span>
          <span>pruned pair</span>
        </div>
      </div>
    </div>
  );
}

// ─── Token Particle ───────────────────────────────────────────────────────────
interface TokenParticleProps {
  startPosition: [number, number, number];
  targetPosition: [number, number, number];
  delay: number;
}

function TokenParticle({ startPosition, targetPosition, delay }: TokenParticleProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (!meshRef.current || !matRef.current) return;
    const elapsed = state.clock.elapsedTime - delay;
    if (elapsed > 0) {
      const duration = 1.8;
      const progress = Math.min((elapsed % (duration + 0.4)) / duration, 1);
      meshRef.current.position.set(
        THREE.MathUtils.lerp(startPosition[0], targetPosition[0], progress),
        THREE.MathUtils.lerp(startPosition[1], targetPosition[1], progress),
        THREE.MathUtils.lerp(startPosition[2], targetPosition[2], progress),
      );
      meshRef.current.scale.setScalar(0.1 + Math.sin(progress * Math.PI) * 0.07);
      matRef.current.opacity = Math.sin(progress * Math.PI);
      const r = THREE.MathUtils.lerp(0.12, 0.06, progress);
      const g = THREE.MathUtils.lerp(0.75, 0.98, progress);
      const b = THREE.MathUtils.lerp(0.95, 0.50, progress);
      matRef.current.color.setRGB(r, g, b);
      matRef.current.emissive.setRGB(r * 0.6, g * 0.6, b * 0.3);
    }
  });

  return (
    <mesh ref={meshRef} position={startPosition}>
      <sphereGeometry args={[0.07, 8, 8]} />
      <meshStandardMaterial ref={matRef} color="#1fbfef" emissive="#0af" emissiveIntensity={1.4} transparent opacity={0} />
    </mesh>
  );
}

// ─── Router Node ──────────────────────────────────────────────────────────────
function RouterNode({ position, isActive }: { position: [number, number, number]; isActive: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.6;
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.25;
    if (glowRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15;
      glowRef.current.scale.setScalar(isActive ? s : 0.8);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        isActive ? 0.12 + Math.sin(state.clock.elapsedTime * 3) * 0.06 : 0.04;
    }
  });

  return (
    <group position={position}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.08} />
      </mesh>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial
          color={isActive ? '#fbbf24' : '#78716c'}
          emissive={isActive ? '#f59e0b' : '#f59e0b'}
          emissiveIntensity={isActive ? 1.0 : 0}
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

// ─── Expert Node ──────────────────────────────────────────────────────────────
interface ExpertNodeProps {
  position: [number, number, number];
  isActive: boolean;
  isPruned: boolean;
  hasToken: boolean;
  expertId: number;
  onHover: (id: number | null) => void;
}

const ExpertNode = React.memo(({ position, isActive, isPruned, hasToken, expertId, onHover }: ExpertNodeProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!meshRef.current || !matRef.current) return;
    if (hasToken) {
      const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 8) * 0.5;
      matRef.current.emissiveIntensity = 0.5 + pulse * 0.8;
      matRef.current.emissive.setRGB(0.06, 0.98, 0.5);
      matRef.current.color.setRGB(0.06, 0.73, 0.4);
      matRef.current.opacity = 1;
    } else if (isActive) {
      matRef.current.emissiveIntensity = 0.3;
      matRef.current.emissive.setRGB(0.06, 0.73, 0.4);
      matRef.current.color.setRGB(0.06, 0.73, 0.4);
      matRef.current.opacity = 1;
    } else if (isPruned) {
      matRef.current.color.setRGB(0.92, 0.92, 0.96);
      matRef.current.emissive.setRGB(0.15, 0.15, 0.18);
      matRef.current.emissiveIntensity = 0.08;
      matRef.current.opacity = 0.55;
    } else {
      // Inactive retained: bright sky-blue
      matRef.current.color.setRGB(0.40, 0.78, 0.98);
      matRef.current.emissive.setRGB(0.10, 0.30, 0.50);
      matRef.current.emissiveIntensity = 0.18;
      matRef.current.opacity = 1;
    }
    if ((isActive || hasToken) && !isPruned) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.3;
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.2;
    }
  });

  const scale = hovered ? 1.5 : hasToken ? 1.3 : isActive ? 1.1 : isPruned ? 0.65 : 1;

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={scale}
      onPointerOver={() => { setHovered(true); onHover(expertId); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); onHover(null); document.body.style.cursor = 'auto'; }}
    >
      <sphereGeometry args={[0.10, 10, 10]} />
      <meshStandardMaterial
        ref={matRef}
        color={isPruned ? '#eaeaf5' : isActive ? '#10b981' : '#66c7f9'}
        emissive={isActive ? '#10b981' : isPruned ? '#222230' : '#1a4a70'}
        emissiveIntensity={isPruned ? 0.08 : isActive ? 0.3 : 0.18}
        metalness={isPruned ? 0.1 : 0.3}
        roughness={isPruned ? 0.7 : 0.4}
        opacity={isPruned ? 0.55 : 1}
        transparent
      />
    </mesh>
  );
});
ExpertNode.displayName = 'ExpertNode';

// ─── Expert count per layer ───────────────────────────────────────────────────
//
//  VISUAL STACK (what you see in the 3D view):
//    renderIndex = totalLayers-1  →  TOP of stack  →  LABEL L0  (earliest layer)
//    renderIndex = 0              →  BOTTOM         →  LABEL L10 (deepest layer)
//
//  PRUNING RULE (from the paper, Section 5.5):
//    L0  (earliest, top)    → FEWEST pruned experts  (most retained)
//    L10 (deepest, bottom)  → MOST pruned experts    (fewest retained)
//
//  logicalLayer = (totalLayers-1) - renderIndex
//    logicalLayer 0  → L0  → top    → high retention
//    logicalLayer 10 → L10 → bottom → low retention
//
//  retentionFactor: HIGH at logicalLayer=0, falls to LOW at logicalLayer=10
//    retentionFactor = 1.0 - 0.7 * (logicalLayer/maxLayer)^2
//    At L0:  1.0 - 0   = 1.00  (most experts kept)
//    At L10: 1.0 - 0.7 = 0.30  (fewest experts kept)
//
//  BASELINE special case: avgExperts === 64 → return 64 always (zero pruning).
//
function getLayerExpertCount(
  renderIndex: number,
  totalLayers: number,
  avgExperts: number,
  totalExperts: number = 64,
): number {
  // ── Baseline: no pruning whatsoever ─────────────────────────────────────────
  if (avgExperts >= totalExperts) return totalExperts;

  // ── Pruned models ────────────────────────────────────────────────────────────
  // logicalLayer 0 = L0 (top, most retained), increases toward L10 (bottom, most pruned)
  const logicalLayer = (totalLayers - 1) - renderIndex;
  const maxLayer = totalLayers - 1;
  const t = logicalLayer / maxLayer; // 0 at L0 → 1 at L10

  // Retention fraction: 1.0 at L0 → 0.30 at L10
  const retentionFraction = 1.0 - 0.70 * (t * t);

  // Normalise so average across all layers ≈ avgExperts
  // avg of (1 - 0.70*t^2) for t in [0,1] = 1 - 0.70/3 ≈ 0.7667
  const avgFraction = 1.0 - 0.70 / 3.0;
  const scaledCount = Math.round((avgExperts / avgFraction) * retentionFraction);

  return Math.max(2, Math.min(totalExperts, scaledCount));
}

// ─── Layer Component ──────────────────────────────────────────────────────────
interface LayerProps {
  layerData: any;
  renderIndex: number;
  totalLayers: number;
  hoveredExpert: number | null;
  onHoverExpert: (id: number | null) => void;
  activeExpertIndices: number[];
  tokenArrived: boolean;
  isCurrentLayer: boolean;
  showConnections: boolean;
  onLayerHover: (renderIdx: number | null, y: number) => void;
  avgExperts: number;
}

const Layer = React.memo(({
  layerData,
  renderIndex,
  totalLayers,
  hoveredExpert,
  onHoverExpert,
  activeExpertIndices,
  tokenArrived,
  isCurrentLayer,
  showConnections,
  onLayerHover,
  avgExperts,
}: LayerProps) => {
  const yPosition = (renderIndex - totalLayers / 2) * 2.8;
  const totalExperts = 64;
  const radius = 2.6;
  const angleStep = (Math.PI * 2) / totalExperts;

  // L0 = top = highest renderIndex; label increases as renderIndex decreases
  const logicalLabel = (totalLayers - 1) - renderIndex;

  const retainedCount = getLayerExpertCount(renderIndex, totalLayers, avgExperts, totalExperts);
  // prunedCount is 0 for baseline because retainedCount === totalExperts
  const prunedCount = totalExperts - retainedCount;

  const { activeExperts, prunedExperts, connections } = useMemo(() => {
    const active = Array.from({ length: retainedCount }, (_, idx) => ({
      position: [
        Math.cos(idx * angleStep) * radius,
        yPosition,
        Math.sin(idx * angleStep) * radius,
      ] as [number, number, number],
      id: renderIndex * 1000 + idx,
      isActive: activeExpertIndices.includes(idx),
      hasToken: tokenArrived && activeExpertIndices.includes(idx),
    }));

    const pruned = Array.from({ length: prunedCount }, (_, idx) => ({
      position: [
        Math.cos((retainedCount + idx) * angleStep) * radius,
        yPosition,
        Math.sin((retainedCount + idx) * angleStep) * radius,
      ] as [number, number, number],
      id: renderIndex * 1000 + retainedCount + idx,
    }));

    const conns = activeExpertIndices
      .filter(idx => idx < active.length)
      .map(idx => ({
        start: new THREE.Vector3(0, yPosition, 0),
        end: new THREE.Vector3(active[idx].position[0], active[idx].position[1], active[idx].position[2]),
      }));

    return { activeExperts: active, prunedExperts: pruned, connections: conns };
  }, [retainedCount, prunedCount, yPosition, renderIndex, activeExpertIndices, angleStep, radius, tokenArrived]);

  return (
    <group
      onPointerEnter={() => onLayerHover(renderIndex, yPosition)}
      onPointerLeave={() => onLayerHover(null, 0)}
    >
      <Text
        position={[-3.8, yPosition, 0]}
        fontSize={0.18}
        color={isCurrentLayer ? '#38bdf8' : '#ffffff'}
        anchorX="right"
        anchorY="middle"
        font={undefined}
      >
        {`L${logicalLabel}`}
      </Text>

      <Text
        position={[3.8, yPosition, 0]}
        fontSize={0.14}
        color="#ffffff"
        anchorX="left"
        anchorY="middle"
        font={undefined}
      >
        {`${retainedCount}/${totalExperts}`}
      </Text>

      <RouterNode position={[0, yPosition, 0]} isActive={isCurrentLayer} />

      {showConnections && tokenArrived && connections.map((conn, i) => (
        <Line key={i} points={[conn.start, conn.end]} color="#22d3ee" lineWidth={1.2} opacity={0.35} transparent />
      ))}

      {activeExperts.map((e) => (
        <ExpertNode
          key={e.id}
          position={e.position}
          isActive={e.isActive}
          isPruned={false}
          hasToken={e.hasToken}
          expertId={e.id}
          onHover={onHoverExpert}
        />
      ))}

      {/* prunedExperts array is empty for baseline (prunedCount === 0) */}
      {prunedExperts.map((e) => (
        <ExpertNode
          key={e.id}
          position={e.position}
          isActive={false}
          isPruned={true}
          hasToken={false}
          expertId={e.id}
          onHover={onHoverExpert}
        />
      ))}

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, yPosition, 0]}>
        <ringGeometry args={[radius - 0.05, radius + 0.05, 64]} />
        <meshBasicMaterial
          color={isCurrentLayer ? '#1e3a5f' : '#1e293b'}
          opacity={isCurrentLayer ? 0.5 : 0.2}
          transparent
        />
      </mesh>

      {isCurrentLayer && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, yPosition, 0]}>
          <ringGeometry args={[radius + 0.06, radius + 0.14, 64]} />
          <meshBasicMaterial color="#38bdf8" opacity={0.3} transparent />
        </mesh>
      )}
    </group>
  );
});
Layer.displayName = 'Layer';

// ─── Main Component ───────────────────────────────────────────────────────────
interface MoEArchitecture3DProps {
  modelData: ModelConfig;
}

export default function MoEArchitecture3D({ modelData }: MoEArchitecture3DProps) {
  const [hoveredExpert, setHoveredExpert] = useState<number | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  // currentTokenLayer is a renderIndex. Starts at totalLayers-1 (top=L0) and decrements to 0 (bottom=L10)
  const [currentTokenLayer, setCurrentTokenLayer] = useState(-1);
  const [arrivedLayers, setArrivedLayers] = useState<Set<number>>(new Set());
    const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConnections, setShowConnections] = useState(true);
  const [hoveredLayer, setHoveredLayer] = useState<number | null>(null);
  const [ckaAnchor, setCkaAnchor] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // Force re-render counter to fix canvas resize after fullscreen exit
  const [resizeTick, setResizeTick] = useState(0);

  const totalLayers = modelData.layers.length;
  // avgExperts: 64 for baseline, lower for pruned models
  const avgExperts = modelData.retainedExperts ?? 64;

  // ── Browser fullscreen API ───────────────────────────────────────────────────
  const handleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      // When exiting fullscreen, force a re-render after a short delay so the
      // canvas re-measures its container and the UI buttons re-appear.
      if (!fs) {
        setTimeout(() => setResizeTick(t => t + 1), 150);
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // ── Per-layer active expert indices (top-6 routing) ──────────────────────────
  const layerActiveExperts = useMemo(() =>
    Array.from({ length: totalLayers }, (_, ri) => {
      const retained = getLayerExpertCount(ri, totalLayers, avgExperts, 64);
      const topK = Math.min(6, retained);
      const avail = Array.from({ length: retained }, (_, i) => i);
      const picked: number[] = [];
      for (let i = 0; i < topK; i++) {
        const idx = Math.floor(Math.abs(Math.sin(ri * 31 + i * 17) * 9999)) % avail.length;
        picked.push(avail[idx]);
        avail.splice(idx, 1);
      }
      return picked.sort((a, b) => a - b);
    }),
  [totalLayers, avgExperts]);

  // ── Token particles ──────────────────────────────────────────────────────────
  // Inference flows from L0 (renderIndex = totalLayers-1, TOP) down to L10 (renderIndex = 0, BOTTOM)
  const tokenParticles = useMemo(() => {
    if (currentTokenLayer < 0) return [];
    const particles: any[] = [];
    for (let ri = totalLayers - 1; ri >= currentTokenLayer; ri--) {
      const yPosition = (ri - totalLayers / 2) * 2.8;
      const retained = getLayerExpertCount(ri, totalLayers, avgExperts, 64);
      const radius = 2.6;
      const angleStep = (Math.PI * 2) / 64;
      // logicalStep: 0 for L0 (first to animate), increases as we go deeper
      const logicalStep = (totalLayers - 1) - ri;
      layerActiveExperts[ri].forEach((idx, ti) => {
        if (idx >= retained) return;
        const angle = idx * angleStep;
        particles.push({
          key: `tok-${ri}-${ti}`,
          startPosition: [0, yPosition, 0] as [number, number, number],
          targetPosition: [Math.cos(angle) * radius, yPosition, Math.sin(angle) * radius] as [number, number, number],
          delay: logicalStep * 2.2 + ti * 0.12,
        });
      });
    }
    return particles;
  }, [currentTokenLayer, totalLayers, avgExperts, layerActiveExperts]);

  // ── Animation ────────────────────────────────────────────────────────────────
  const startAnimation = useCallback(() => {
    setCurrentTokenLayer(totalLayers - 1); // start at top = L0
    setArrivedLayers(new Set());
    setIsAnimating(true);
  }, [totalLayers]);

  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const resetAnimation = useCallback(() => {
    setIsAnimating(false);
    setCurrentTokenLayer(-1);
    setArrivedLayers(new Set());
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (!isAnimating) return;
    intervalRef.current = setInterval(() => {
      setCurrentTokenLayer(prev => {
        setTimeout(() => setArrivedLayers(a => new Set([...a, prev])), 900);
        const next = prev - 1; // move downward layer by layer
        if (next < 0) {
          setIsAnimating(false);
          return prev;
        }
        return next;
      });
    }, 2200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isAnimating]);

  // ── Layer hover → CKA popup ──────────────────────────────────────────────────
  const handleLayerHover = useCallback((renderIdx: number | null, y: number) => {
    setHoveredLayer(renderIdx);
    if (renderIdx !== null && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCkaAnchor({ x: rect.width * 0.62, y: rect.height * 0.12 });
    } else {
      setCkaAnchor(null);
    }
  }, []);

  const retainedForHoveredLayer = hoveredLayer !== null
    ? getLayerExpertCount(hoveredLayer, totalLayers, avgExperts, 64)
    : 32;

  // Logical label shown in the stats panel
  const currentLogicalLabel = currentTokenLayer >= 0 ? (totalLayers - 1) - currentTokenLayer : -1;

  // ── Canvas ───────────────────────────────────────────────────────────────────
   const canvasContent = (
    <Canvas
      key={resizeTick} // Force remount on fullscreen exit to recalculate size
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      style={{ background: 'transparent' }}
      camera={{ position: [0, 2, 18], fov: 48, near: 0.1, far: 200 }}
    >
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 20, 0]} intensity={0.8} color="#38bdf8" />
      <pointLight position={[10, 0, 10]} intensity={0.5} color="#a78bfa" />
      <pointLight position={[-10, 0, -10]} intensity={0.3} color="#10b981" />

      {Array.from({ length: totalLayers }, (_, ri) => (
        <Layer
          key={ri}
          layerData={modelData.layers[ri]}
          renderIndex={ri}
          totalLayers={totalLayers}
          hoveredExpert={hoveredExpert}
          onHoverExpert={setHoveredExpert}
          activeExpertIndices={layerActiveExperts[ri]}
          tokenArrived={arrivedLayers.has(ri)}
          isCurrentLayer={ri === currentTokenLayer}
          showConnections={showConnections}
          onLayerHover={handleLayerHover}
          avgExperts={avgExperts}
        />
      ))}

      {tokenParticles.map((p) => (
        <TokenParticle key={p.key} startPosition={p.startPosition} targetPosition={p.targetPosition} delay={p.delay} />
      ))}

      <gridHelper args={[40, 40, '#0f172a', '#0f172a']} position={[0, (0 - totalLayers / 2) * 2.8 - 2, 0]} />

      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        autoRotate={autoRotate}
        autoRotateSpeed={0.4}
        maxDistance={37}
        minDistance={5}
        enablePan
        zoomToCursor={true}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
        target={[0, 0, 0]}
/>
    </Canvas>
  );

  // ── UI Panels ─────────────────────────────────────────────────────────────────
  const panelBase: React.CSSProperties = {
    position: 'absolute',
    background: 'rgba(5,10,20,0.85)',
    backdropFilter: 'blur(12px)',
    borderRadius: 12,
    border: '1px solid rgba(56,189,248,0.15)',
  };

  return (
        <div
      ref={containerRef}
      style={{
        width: '100%',
        height: isFullscreen ? '100vh' : '100%',
        minHeight: isFullscreen ? '100vh' : 640,
        background: 'radial-gradient(ellipse at 30% 40%, rgba(14,30,60,0.9) 0%, rgba(3,7,18,1) 100%)',
        borderRadius: isFullscreen ? 0 : 16,
        border: isFullscreen ? 'none' : '1px solid rgba(56,189,248,0.12)',
        overflow: 'hidden',
        position: 'relative',
        flex: 1,
      }}
    >
      {/* Controls */}
      <div style={{ ...panelBase, top: 16, left: 16, zIndex: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
        <div style={{ color: '#38bdf8', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 4 }}>CONTROLS</div>
        <button
          onClick={isAnimating ? stopAnimation : startAnimation}
          style={{
            background: isAnimating ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
            border: `1px solid ${isAnimating ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
            color: isAnimating ? '#f87171' : '#34d399',
            borderRadius: 8, padding: '7px 12px', fontSize: 11,
            fontFamily: 'monospace', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {isAnimating ? <><Pause size={12} /> PAUSE</> : <><Play size={12} /> RUN INFERENCE</>}
        </button>
        <button
          onClick={resetAnimation}
          style={{
            background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.25)',
            color: '#ffffff', borderRadius: 8, padding: '7px 12px',
            fontSize: 11, fontFamily: 'monospace', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <RotateCcw size={12} /> RESET
        </button>
        <button
          onClick={() => setAutoRotate(v => !v)}
          style={{
            background: autoRotate ? 'rgba(56,189,248,0.12)' : 'rgba(100,116,139,0.08)',
            border: `1px solid ${autoRotate ? 'rgba(56,189,248,0.35)' : 'rgba(100,116,139,0.2)'}`,
            color: autoRotate ? '#38bdf8' : '#ffffff',
            borderRadius: 8, padding: '7px 12px', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer',
          }}
        >
          ROTATE {autoRotate ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={() => setShowConnections(v => !v)}
          style={{
            background: showConnections ? 'rgba(251,191,36,0.1)' : 'rgba(100,116,139,0.08)',
            border: `1px solid ${showConnections ? 'rgba(251,191,36,0.3)' : 'rgba(100,116,139,0.2)'}`,
            color: showConnections ? '#fbbf24' : '#ffffff',
            borderRadius: 8, padding: '7px 12px', fontSize: 11, fontFamily: 'monospace', cursor: 'pointer',
          }}
        >
          WIRES {showConnections ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Legend */}
      <div style={{ ...panelBase, top: 16, right: 16, zIndex: 10, padding: '14px 16px' }}>
        <div style={{ color: '#38bdf8', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 10 }}>LEGEND</div>
        {[
          { color: '#66c7f9', label: 'Inactive Expert' },
          { color: '#10b981', label: 'Active Expert' },
          { color: '#22d3ee', label: 'Token Flow', glow: true },
          { color: '#eaeaf5', label: 'Pruned Expert', dim: true },
          { color: '#fbbf24', label: 'Router' },
        ].map(({ color, label, dim, glow }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%', background: color,
              opacity: dim ? 0.55 : 1,
              boxShadow: glow ? `0 0 6px ${color}` : 'none',
            }} />
            <span style={{ color: '#ffffff', fontSize: 11, fontFamily: 'monospace' }}>{label}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid rgba(56,189,248,0.1)', marginTop: 8, paddingTop: 8 }}>
          <div style={{ color: '#e2e8f0', fontSize: 10, fontFamily: 'monospace' }}>Hover layer → CKA graph</div>
          <div style={{ color: '#e2e8f0', fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>Deeper layers (L10): more pruned</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ ...panelBase, bottom: 16, left: 16, zIndex: 10, padding: '12px 16px' }}>
        <div style={{ color: '#f8fafc', fontSize: 13, fontFamily: 'monospace', fontWeight: 700, marginBottom: 6 }}>
          {modelData.name}
        </div>
        {[
          ['Layers', totalLayers],
          ['Avg Experts', avgExperts >= 64 ? '64/64' : `~${avgExperts}/64`],
          ['Compression', `${modelData.compressionRatio}×`],
          ['Current Layer', currentLogicalLabel >= 0 ? `L${currentLogicalLabel}` : '—'],
        ].map(([k, v]) => (
          <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3 }}>
            <span style={{ color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace' }}>{k}</span>
            <span style={{
              color: currentLogicalLabel >= 0 && k === 'Current Layer' ? '#22d3ee' : '#ffffff',
              fontSize: 11, fontFamily: 'monospace',
            }}>{String(v)}</span>
          </div>
        ))}
      </div>

      {/* Fullscreen button */}
      {isFullscreen ? (
        <button
          onClick={handleFullscreen}
          style={{
            position: 'absolute', bottom: 16, right: 16, zIndex: 60,
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
            color: '#f87171', borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'monospace',
          }}
        >
          <X size={14} /> EXIT FULLSCREEN
        </button>
      ) : (
        <button
          onClick={handleFullscreen}
          style={{
            position: 'absolute', bottom: 16, right: 16, zIndex: 10,
            background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)',
            color: '#a78bfa', borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'monospace',
          }}
        >
          <Maximize2 size={12} /> FULLSCREEN
        </button>
      )}

      {/* CKA Graph overlay */}
      {hoveredLayer !== null && ckaAnchor && (
        <div style={{ position: 'absolute', left: ckaAnchor.x, top: ckaAnchor.y, zIndex: 50 }}>
          <CKAGraph
            layerIndex={(totalLayers - 1) - hoveredLayer}
            expertCount={retainedForHoveredLayer}
            onClose={() => setHoveredLayer(null)}
          />
        </div>
      )}

      {canvasContent}
    </div>
  );
}