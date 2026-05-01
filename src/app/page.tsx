'use client';
import Link from 'next/link';
import { MessageSquare, Zap, Cpu, BarChart3, GitBranch, ChevronRight, Activity, Play, Pause, RotateCcw } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import MoEArchitecture3D from '@/components/visualizations/MoEArchitecture3D';
import ModelStats from '@/components/visualizations/ModelStats';
import { ModelConfig } from '@/types/model';

// ─── Animated grid background ────────────────────────────────────────────────
function GridBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(15,30,80,0.6) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(50,10,80,0.4) 0%, transparent 60%), #030712',
      }} />
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.06 }}>
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
      }} />
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, accent }: { icon: any; value: string; label: string; accent: string }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, rgba(5,10,25,0.9) 0%, rgba(10,20,40,0.8) 100%)`,
      border: `1px solid ${accent}22`, borderRadius: 12, padding: '18px 20px',
      position: 'relative', overflow: 'hidden', flex: 1, minWidth: 120,
    }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`, borderRadius: '0 12px 0 80px' }} />
      <div style={{ color: accent, marginBottom: 8, opacity: 0.9 }}><Icon size={18} /></div>
      <div style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, fontFamily: 'monospace', letterSpacing: -1 }}>{value}</div>
      <div style={{ color: '#ffffff', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Model tab config ─────────────────────────────────────────────────────────
const MODEL_TABS = [
  {
    id: 'baseline', label: 'BASELINE', sublabel: '0% pruned', accent: '#38bdf8',
    accentDim: 'rgba(56,189,248,0.12)', accentBorder: 'rgba(56,189,248,0.3)',
    description: 'Full DeepSeek-VL2 Tiny · 64 experts/layer · 3.37B params', dataKey: 'baseline' as const,
    stats: [
      { icon: Cpu, value: '3.37B', label: 'Parameters' }, { icon: GitBranch, value: '64', label: 'Experts/Layer' },
      { icon: Zap, value: '1.0×', label: 'Compression' }, { icon: Activity, value: '12.3GB', label: 'VRAM' },
    ],
  },
  {
    id: 'pruned40', label: '40% PRUNED', sublabel: 'LiteDoc-60', accent: '#a78bfa',
    accentDim: 'rgba(167,139,250,0.10)', accentBorder: 'rgba(167,139,250,0.28)',
    description: 'CKA pruned · ~38 experts/layer · 2.4B params · 1.4× compression', dataKey: 'pruned40' as const,
    stats: [
      { icon: Cpu, value: '2.4B', label: 'Parameters' }, { icon: GitBranch, value: '~38', label: 'Experts/Layer' },
      { icon: Zap, value: '1.4×', label: 'Compression' }, { icon: Activity, value: '9.8GB', label: 'VRAM' },
    ],
  },
  {
    id: 'pruned80', label: '80% PRUNED', sublabel: 'LiteDoc-20', accent: '#f472b6',
    accentDim: 'rgba(244,114,182,0.10)', accentBorder: 'rgba(244,114,182,0.28)',
    description: 'Aggressive CKA pruning · ~13 experts/layer · 1.4B params · 2.4× compression', dataKey: 'pruned80' as const,
    stats: [
      { icon: Cpu, value: '1.4B', label: 'Parameters' }, { icon: GitBranch, value: '~13', label: 'Experts/Layer' },
      { icon: Zap, value: '2.4×', label: 'Compression' }, { icon: Activity, value: '7.4GB', label: 'VRAM' },
    ],
  },
];

function SectionHeading({ icon: Icon, label, accent }: { icon: any; label: string; accent: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accent}18`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
        <Icon size={16} />
      </div>
      <span style={{ color: '#ffffff', fontSize: 12, fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${accent}20, transparent)` }} />
    </div>
  );
}

function PerfBadge({ value, label, accent }: { value: string; label: string; accent: string }) {
  return (
    <div style={{ background: `${accent}10`, border: `1px solid ${accent}25`, borderRadius: 8, padding: '8px 14px', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ color: accent, fontSize: 15, fontWeight: 700, fontFamily: 'monospace' }}>{value}</span>
      <span style={{ color: '#ffffff', fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ARCHITECTURE CHAPTERS
// ═══════════════════════════════════════════════════════════════════════════════
const ARCHITECTURE_CHAPTERS = [
  {
    id: 'tiling', label: 'Dynamic Tiling', sub: 'SigLIP 384²', color: '#38bdf8',
    description: 'High-resolution images are dynamically split into local tiles using a SigLIP-SO400M-384 encoder. Candidate resolutions minimise padding for arbitrary aspect ratios.',
    details: [
      'Candidate set: (m·384, n·384) where mn ≤ 9',
      'Global thumbnail + m×n local tiles processed independently',
      'Each tile yields 27×27 = 729 visual embeddings',
      'Selected resolution minimises padded area',
    ],
  },
  {
    id: 'adapter', label: 'VL Adapter', sub: '2-Layer MLP', color: '#a78bfa',
    description: 'A 2-layer MLP projector with 2×2 pixel shuffle compresses visual tokens and injects special separator tokens before feeding into the language model.',
    details: [
      'Pixel shuffle: 27×27 → 14×14 tokens per tile',
      'Special tokens: <tile_newline> and <view_separator>',
      'Projects visual features into LLM embedding space',
      'Total visual tokens: 210 + 1 + m·14×(n·14+1)',
    ],
  },
  {
    id: 'moe', label: 'DeepSeekMoE', sub: '64 Experts', color: '#f472b6',
    description: 'Mixture-of-Experts decoder with Multi-head Latent Attention. 64 routed + 2 shared experts per layer with top-6 routing and auxiliary-loss-free load balancing.',
    details: [
      'Multi-head Latent Attention (MLA) compresses KV cache',
      '64 routed experts, 2 shared experts, top-6 selection',
      'Sparse computation across 11 transformer blocks',
      'Distilled student retains ~89.6 % teacher performance',
    ],
  },
];

function ArchitectureMiniMap({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {ARCHITECTURE_CHAPTERS.map((layer, idx) => (
        <button key={layer.id} onClick={() => onSelect(layer.id)} style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 8,
          border: `1px solid ${activeId === layer.id ? layer.color + '40' : 'transparent'}`,
          background: activeId === layer.id ? layer.color + '12' : 'transparent',
          cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: activeId === layer.id ? layer.color + '25' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${activeId === layer.id ? layer.color + '50' : 'rgba(255,255,255,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: activeId === layer.id ? layer.color : '#64748b',
            fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
          }}>
            {idx + 1}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: activeId === layer.id ? '#fff' : '#cbd5e1', fontSize: 12, fontFamily: 'monospace', fontWeight: 600 }}>{layer.label}</div>
            <div style={{ color: activeId === layer.id ? layer.color : '#64748b', fontSize: 9, fontFamily: 'monospace', marginTop: 1 }}>{layer.sub}</div>
          </div>
          {activeId === layer.id && <div style={{ width: 3, height: 20, borderRadius: 2, background: layer.color, flexShrink: 0 }} />}
        </button>
      ))}
    </div>
  );
}

// ─── Shared inference controls bar ───────────────────────────────────────────
function InferenceControls({
  isAnimating, step, totalSteps, onPlay, onPause, onReset, accent, stepLabel,
}: {
  isAnimating: boolean; step: number; totalSteps: number;
  onPlay: () => void; onPause: () => void; onReset: () => void;
  accent: string; stepLabel: string;
}) {
  return (
    <div style={{
      position: 'absolute', top: 16, left: 16, zIndex: 20,
      background: 'rgba(5,10,20,0.88)', backdropFilter: 'blur(12px)',
      border: `1px solid rgba(${accent === '#38bdf8' ? '56,189,248' : accent === '#a78bfa' ? '167,139,250' : '244,114,182'},0.2)`,
      borderRadius: 12, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 8, minWidth: 162,
    }}>
      <div style={{ color: accent, fontSize: 9, fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase' }}>CONTROLS</div>
      <button onClick={isAnimating ? onPause : onPlay} style={{
        background: isAnimating ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
        border: `1px solid ${isAnimating ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
        color: isAnimating ? '#f87171' : '#34d399',
        borderRadius: 8, padding: '7px 12px', fontSize: 11,
        fontFamily: 'monospace', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {isAnimating ? <><Pause size={12} /> PAUSE</> : <><Play size={12} /> RUN INFERENCE</>}
      </button>
      <button onClick={onReset} style={{
        background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.25)',
        color: '#ffffff', borderRadius: 8, padding: '7px 12px',
        fontSize: 11, fontFamily: 'monospace', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <RotateCcw size={12} /> RESET
      </button>
      {step >= 0 && (
        <div style={{ marginTop: 2 }}>
          <div style={{ color: accent, fontSize: 10, fontFamily: 'monospace', marginBottom: 4 }}>{stepLabel}</div>
          {/* Progress bar */}
          <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              width: `${((step + 1) / totalSteps) * 100}%`, height: '100%',
              background: `linear-gradient(to right, ${accent}80, ${accent})`,
              borderRadius: 2, transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{ color: '#64748b', fontSize: 9, fontFamily: 'monospace', marginTop: 3 }}>
            Step {step + 1} / {totalSteps}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DYNAMIC TILING STAGE (animated) ─────────────────────────────────────────
// Steps: 0=Input arrives, 1=Resolution selected, 2=Global thumb extracted, 3=Tiles split, 4=SigLIP encodes each tile, 5=Embeddings ready
const TILING_STEPS = [
  { label: 'Input image received' },
  { label: 'Resolution selected: 768×1152' },
  { label: 'Global thumbnail extracted' },
  { label: 'Image split into 2×3 tiles' },
  { label: 'SigLIP encodes each tile' },
  { label: 'Embeddings ready (729/tile)' },
];

function DynamicTilingStage() {
  const [step, setStep] = useState(-1);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalSteps = TILING_STEPS.length;

  const startAnimation = useCallback(() => {
    setStep(0);
    setIsAnimating(true);
  }, []);

  const pauseAnimation = useCallback(() => {
    setIsAnimating(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const resetAnimation = useCallback(() => {
    setIsAnimating(false);
    setStep(-1);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (!isAnimating) return;
    intervalRef.current = setInterval(() => {
      setStep(prev => {
        if (prev >= totalSteps - 1) { setIsAnimating(false); return prev; }
        return prev + 1;
      });
    }, 1400);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isAnimating, totalSteps]);

  const accent = '#38bdf8';
  const tileCount = 6; // 2×3 grid

  // Derived state
  const imageActive = step >= 0;
  const resolutionActive = step >= 1;
  const thumbActive = step >= 2;
  const tilesActive = step >= 3;
  const encodingActive = step >= 4;
  const embeddingsActive = step >= 5;

  const glowAnim = `
    @keyframes tile-pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
    @keyframes particle-flow { 0%{transform:translateX(0);opacity:0} 20%{opacity:1} 80%{opacity:1} 100%{transform:translateX(60px);opacity:0} }
    @keyframes embed-pop { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
    @keyframes scan-line { 0%{top:0%} 100%{top:100%} }
  `;

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: 'radial-gradient(ellipse at 30% 40%, rgba(14,30,60,0.9) 0%, rgba(3,7,18,1) 100%)',
      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <style>{glowAnim}</style>
      {/* grid */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: `linear-gradient(${accent} 1px, transparent 1px), linear-gradient(90deg, ${accent} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

      {/* Header */}
      <div style={{ position: 'absolute', top: 16, left: 192, zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ color: accent, fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 }}>COMPONENT</div>
        <div style={{ color: '#fff', fontSize: 18, fontFamily: 'monospace', fontWeight: 700, marginTop: 2 }}>Dynamic Tiling</div>
      </div>

      <InferenceControls
        isAnimating={isAnimating} step={step} totalSteps={totalSteps}
        onPlay={startAnimation} onPause={pauseAnimation} onReset={resetAnimation}
        accent={accent} stepLabel={step >= 0 ? TILING_STEPS[step].label : ''}
      />

      {/* ── Main diagram ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, position: 'relative', zIndex: 5 }}>

        {/* Input image */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 180, height: 130, borderRadius: 10,
            background: 'linear-gradient(135deg, #1e3a5f, #0f172a)',
            border: `1px solid ${imageActive ? accent : 'rgba(56,189,248,0.15)'}`,
            boxShadow: imageActive ? `0 0 24px ${accent}30` : 'none',
            overflow: 'hidden', position: 'relative',
            transition: 'border-color 0.4s, box-shadow 0.4s',
          }}>
            {/* Simulated document content */}
            <div style={{ padding: 10, opacity: imageActive ? 0.7 : 0.25, transition: 'opacity 0.4s' }}>
              <div style={{ width: '60%', height: 5, background: accent, borderRadius: 2, marginBottom: 5 }} />
              <div style={{ width: '40%', height: 5, background: accent, borderRadius: 2, marginBottom: 10, opacity: 0.6 }} />
              <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                {[48, 48, 48].map((w, i) => (
                  <div key={i} style={{ width: w, height: 40, background: `rgba(56,189,248,0.18)`, borderRadius: 3 }} />
                ))}
              </div>
              <div style={{ width: '80%', height: 4, background: `rgba(56,189,248,0.3)`, borderRadius: 2, marginBottom: 3 }} />
              <div style={{ width: '65%', height: 4, background: `rgba(56,189,248,0.2)`, borderRadius: 2 }} />
            </div>

            {/* Tile grid overlay — appears at step 3 */}
            {tilesActive && (
              <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
                {Array.from({ length: tileCount }, (_, i) => (
                  <div key={i} style={{
                    border: `1px solid ${accent}60`,
                    background: encodingActive ? `${accent}10` : 'transparent',
                    transition: 'background 0.3s',
                    animation: encodingActive ? `tile-pulse 1.2s ease-in-out ${i * 0.15}s infinite` : 'none',
                  }} />
                ))}
              </div>
            )}

            {/* Scan line — resolution selection step */}
            {resolutionActive && !tilesActive && (
              <div style={{
                position: 'absolute', left: 0, right: 0, height: 2,
                background: `linear-gradient(to right, transparent, ${accent}, transparent)`,
                animation: 'scan-line 0.8s ease-in-out',
                opacity: 0.8,
              }} />
            )}
          </div>
          <div style={{ color: imageActive ? accent : '#334155', fontSize: 10, fontFamily: 'monospace', transition: 'color 0.4s', textAlign: 'center' }}>
            Input Image
          </div>
        </div>

        {/* Resolution badge + arrow */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {/* Resolution badge */}
          <div style={{
            background: resolutionActive ? `rgba(56,189,248,0.1)` : 'rgba(255,255,255,0.02)',
            border: `1px solid ${resolutionActive ? accent + '50' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 8, padding: '6px 10px', transition: 'all 0.4s',
            boxShadow: resolutionActive ? `0 0 12px ${accent}20` : 'none',
          }}>
            <div style={{ color: resolutionActive ? accent : '#334155', fontSize: 9, fontFamily: 'monospace', letterSpacing: 1, transition: 'color 0.4s' }}>RESOLUTION</div>
            <div style={{ color: resolutionActive ? '#fff' : '#1e293b', fontSize: 13, fontFamily: 'monospace', fontWeight: 700, transition: 'color 0.4s' }}>768×1152</div>
            <div style={{ color: resolutionActive ? `${accent}99` : '#1e293b', fontSize: 8, fontFamily: 'monospace', transition: 'color 0.4s' }}>m=2, n=3</div>
          </div>
          {/* Arrow */}
          <div style={{ color: tilesActive ? accent : '#1e3a5f', fontSize: 20, lineHeight: 1, transition: 'color 0.4s' }}>→</div>
        </div>

        {/* Tiles + Global thumb column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>

          {/* Global thumbnail */}
          <div style={{
            width: 100, height: 68, borderRadius: 8,
            background: thumbActive ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${thumbActive ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: thumbActive ? '0 0 16px rgba(245,158,11,0.2)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.4s',
          }}>
            <span style={{ color: thumbActive ? '#fbbf24' : '#1e293b', fontSize: 9, fontFamily: 'monospace', transition: 'color 0.4s', textAlign: 'center', padding: '0 4px' }}>
              Global<br />Thumbnail
            </span>
          </div>

          {/* 2×3 tile grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
            {Array.from({ length: tileCount }, (_, i) => (
              <div key={i} style={{
                width: 30, height: 30, borderRadius: 4,
                background: tilesActive ? `${accent}18` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${tilesActive ? accent + '50' : 'rgba(255,255,255,0.05)'}`,
                boxShadow: encodingActive ? `0 0 8px ${accent}30` : 'none',
                transition: 'all 0.3s',
                transitionDelay: tilesActive ? `${i * 60}ms` : '0ms',
                animation: encodingActive ? `tile-pulse 1.4s ease-in-out ${i * 0.18}s infinite` : 'none',
              }} />
            ))}
          </div>

          <div style={{ color: tilesActive ? '#94a3b8' : '#1e3a5f', fontSize: 9, fontFamily: 'monospace', transition: 'color 0.4s' }}>
            6 Local Tiles
          </div>
        </div>

        {/* Arrow + SigLIP */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ color: encodingActive ? accent : '#1e3a5f', fontSize: 20, transition: 'color 0.4s' }}>→</div>
          {/* SigLIP box */}
          <div style={{
            width: 88, height: 88, borderRadius: 10,
            background: encodingActive ? `${accent}12` : 'rgba(255,255,255,0.02)',
            border: `1px solid ${encodingActive ? accent + '50' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: encodingActive ? `0 0 20px ${accent}25` : 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            transition: 'all 0.4s',
          }}>
            <div style={{ color: encodingActive ? accent : '#1e3a5f', fontSize: 10, fontFamily: 'monospace', textAlign: 'center', fontWeight: 700, transition: 'color 0.4s' }}>
              SigLIP
            </div>
            <div style={{ color: encodingActive ? `${accent}aa` : '#0f172a', fontSize: 8, fontFamily: 'monospace', textAlign: 'center', transition: 'color 0.4s' }}>
              SO400M<br />384×384
            </div>
            {/* inner pulse rings */}
            {encodingActive && (
              <>
                <div style={{ position: 'absolute', width: 88, height: 88, borderRadius: 10, border: `1px solid ${accent}40`, animation: 'tile-pulse 1s ease-in-out infinite' }} />
              </>
            )}
          </div>
          <div style={{ color: encodingActive ? accent : '#1e3a5f', fontSize: 20, transition: 'color 0.4s' }}>→</div>
        </div>

        {/* Output embeddings */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 100, padding: '10px 12px', borderRadius: 10,
            background: embeddingsActive ? `${accent}10` : 'rgba(255,255,255,0.02)',
            border: `1px solid ${embeddingsActive ? accent + '40' : 'rgba(255,255,255,0.05)'}`,
            boxShadow: embeddingsActive ? `0 0 20px ${accent}20` : 'none',
            transition: 'all 0.4s',
          }}>
            {/* embedding grid dots */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 3, marginBottom: 8 }}>
              {Array.from({ length: 18 }, (_, i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: embeddingsActive ? accent : 'rgba(255,255,255,0.04)',
                  opacity: embeddingsActive ? 0.7 + Math.random() * 0.3 : 1,
                  transition: 'background 0.3s',
                  transitionDelay: `${i * 30}ms`,
                  animation: embeddingsActive ? `embed-pop 0.4s ease-out ${i * 40}ms both` : 'none',
                }} />
              ))}
            </div>
            <div style={{ color: embeddingsActive ? accent : '#1e3a5f', fontSize: 9, fontFamily: 'monospace', textAlign: 'center', transition: 'color 0.4s' }}>
              729 × 1152d<br />per tile
            </div>
          </div>
          <div style={{ color: embeddingsActive ? '#94a3b8' : '#1e3a5f', fontSize: 9, fontFamily: 'monospace', transition: 'color 0.4s' }}>
            Visual Embeddings
          </div>
        </div>
      </div>

      {/* Bottom status */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(5,10,20,0.8)', backdropFilter: 'blur(8px)',
        border: `1px solid ${accent}15`, borderRadius: 8, padding: '7px 16px',
        color: step >= 0 ? accent : '#334155', fontSize: 10, fontFamily: 'monospace',
        letterSpacing: 1, transition: 'color 0.3s', whiteSpace: 'nowrap',
      }}>
        {step >= 0 ? `▸  ${TILING_STEPS[step].label.toUpperCase()}` : 'PRESS RUN INFERENCE TO START'}
      </div>
    </div>
  );
}

// ─── VL ADAPTER STAGE (animated) ─────────────────────────────────────────────
// Steps: 0=Tiles received, 1=Pixel shuffle, 2=view_separator injected, 3=Linear layer 1, 4=Linear layer 2 / projection, 5=LM tokens ready
const ADAPTER_STEPS = [
  { label: 'Visual tiles received from SigLIP' },
  { label: 'Pixel shuffle: 27×27 → 14×14' },
  { label: 'Special tokens injected' },
  { label: 'Linear + GELU (layer 1)' },
  { label: 'Linear projection (layer 2)' },
  { label: 'LM embedding tokens ready' },
];

function VLAdapterStage() {
  const [step, setStep] = useState(-1);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalSteps = ADAPTER_STEPS.length;

  const startAnimation = useCallback(() => {
    setStep(0);
    setIsAnimating(true);
  }, []);

  const pauseAnimation = useCallback(() => {
    setIsAnimating(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const resetAnimation = useCallback(() => {
    setIsAnimating(false);
    setStep(-1);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (!isAnimating) return;
    intervalRef.current = setInterval(() => {
      setStep(prev => {
        if (prev >= totalSteps - 1) { setIsAnimating(false); return prev; }
        return prev + 1;
      });
    }, 1500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isAnimating, totalSteps]);

  const accent = '#a78bfa';
  const accentAmber = '#f59e0b';
  const accentCyan = '#22d3ee';

  const tilesIn = step >= 0;
  const shuffleActive = step >= 1;
  const tokensActive = step >= 2;
  const layer1Active = step >= 3;
  const layer2Active = step >= 4;
  const outputActive = step >= 5;

  const adapterAnim = `
    @keyframes adp-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
    @keyframes adp-flow { 0%{stroke-dashoffset:60} 100%{stroke-dashoffset:0} }
    @keyframes adp-pop { 0%{transform:scaleY(0);opacity:0} 100%{transform:scaleY(1);opacity:1} }
    @keyframes adp-slide { 0%{transform:translateX(-8px);opacity:0} 100%{transform:translateX(0);opacity:1} }
  `;

  // Token grid helper
  const TokenGrid = ({ cols, rows, active, color, delay = 0 }: { cols: number; rows: number; active: boolean; color: string; delay?: number }) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: 2 }}>
      {Array.from({ length: cols * rows }, (_, i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: 1,
          background: active ? color : 'rgba(255,255,255,0.04)',
          transition: 'background 0.25s',
          transitionDelay: active ? `${delay + i * 8}ms` : '0ms',
        }} />
      ))}
    </div>
  );

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: 'radial-gradient(ellipse at 30% 40%, rgba(14,30,60,0.9) 0%, rgba(3,7,18,1) 100%)',
      overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <style>{adapterAnim}</style>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: `linear-gradient(${accent} 1px, transparent 1px), linear-gradient(90deg, ${accent} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

      {/* Header */}
      <div style={{ position: 'absolute', top: 16, left: 192, zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ color: accent, fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 }}>COMPONENT</div>
        <div style={{ color: '#fff', fontSize: 18, fontFamily: 'monospace', fontWeight: 700, marginTop: 2 }}>VL Adapter</div>
      </div>

      <InferenceControls
        isAnimating={isAnimating} step={step} totalSteps={totalSteps}
        onPlay={startAnimation} onPause={pauseAnimation} onReset={resetAnimation}
        accent={accent} stepLabel={step >= 0 ? ADAPTER_STEPS[step].label : ''}
      />

      {/* ── Main pipeline ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 5 }}>

        {/* Stage 1: Input tiles (27×27 each) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{
            padding: '10px', borderRadius: 10,
            background: tilesIn ? 'rgba(56,189,248,0.08)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${tilesIn ? 'rgba(56,189,248,0.35)' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: tilesIn ? '0 0 16px rgba(56,189,248,0.12)' : 'none',
            transition: 'all 0.4s',
          }}>
            <TokenGrid cols={9} rows={9} active={tilesIn} color="rgba(56,189,248,0.7)" />
          </div>
          <div style={{ color: tilesIn ? '#38bdf8' : '#1e3a5f', fontSize: 9, fontFamily: 'monospace', transition: 'color 0.4s', textAlign: 'center' }}>
            27×27 tokens<br />(per tile)
          </div>
        </div>

        {/* Arrow + pixel shuffle label */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            padding: '5px 8px', borderRadius: 6,
            background: shuffleActive ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${shuffleActive ? accent + '40' : 'rgba(255,255,255,0.05)'}`,
            transition: 'all 0.4s',
          }}>
            <div style={{ color: shuffleActive ? accent : '#1e3a5f', fontSize: 8, fontFamily: 'monospace', textAlign: 'center', transition: 'color 0.4s' }}>
              2×2<br />pixel<br />shuffle
            </div>
          </div>
          <div style={{ color: shuffleActive ? accent : '#1e3a5f', fontSize: 16, transition: 'color 0.4s' }}>→</div>
        </div>

        {/* Stage 2: Shuffled tokens 14×14 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{
            padding: '8px', borderRadius: 10,
            background: shuffleActive ? `${accent}10` : 'rgba(255,255,255,0.02)',
            border: `1px solid ${shuffleActive ? accent + '35' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: shuffleActive ? `0 0 14px ${accent}20` : 'none',
            transition: 'all 0.4s',
          }}>
            <TokenGrid cols={7} rows={7} active={shuffleActive} color={`${accent}cc`} delay={0} />
          </div>
          <div style={{ color: shuffleActive ? accent : '#1e3a5f', fontSize: 9, fontFamily: 'monospace', transition: 'color 0.4s', textAlign: 'center' }}>
            14×14 tokens<br />(196 per tile)
          </div>
        </div>

        {/* Arrow + special tokens */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ color: tokensActive ? accent : '#1e3a5f', fontSize: 16, transition: 'color 0.4s' }}>→</div>
          {/* Special token badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {[
              { label: '<sep>', color: accentAmber, active: tokensActive },
              { label: '<\\n>', color: accentCyan, active: tokensActive },
            ].map(({ label, color, active }) => (
              <div key={label} style={{
                padding: '3px 7px', borderRadius: 4, fontSize: 8, fontFamily: 'monospace',
                background: active ? `${color}15` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${active ? color + '40' : 'rgba(255,255,255,0.05)'}`,
                color: active ? color : '#1e3a5f',
                transition: 'all 0.4s',
                animation: active ? 'adp-slide 0.3s ease-out both' : 'none',
              }}>
                {label}
              </div>
            ))}
          </div>
          <div style={{ color: layer1Active ? accent : '#1e3a5f', fontSize: 16, transition: 'color 0.4s' }}>→</div>
        </div>

        {/* MLP block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 110 }}>
          {/* Layer 1 */}
          <div style={{
            height: 48, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: layer1Active ? `${accent}12` : 'rgba(255,255,255,0.02)',
            border: `1px solid ${layer1Active ? accent + '45' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: layer1Active ? `0 0 16px ${accent}20` : 'none',
            transition: 'all 0.4s', gap: 2,
          }}>
            <div style={{ color: layer1Active ? accent : '#1e3a5f', fontSize: 10, fontFamily: 'monospace', fontWeight: 700, transition: 'color 0.4s' }}>Linear</div>
            <div style={{ color: layer1Active ? `${accent}99` : '#0f172a', fontSize: 8, fontFamily: 'monospace', transition: 'color 0.4s' }}>+ GELU</div>
            {layer1Active && (
              <div style={{ width: '70%', height: 2, borderRadius: 1, background: `linear-gradient(to right, transparent, ${accent}, transparent)`, animation: 'adp-pulse 0.8s ease-in-out infinite' }} />
            )}
          </div>

          {/* Connector dot */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 1, height: 8, background: layer1Active ? `${accent}50` : 'rgba(255,255,255,0.05)', transition: 'background 0.4s' }} />
          </div>

          {/* Layer 2 */}
          <div style={{
            height: 48, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: layer2Active ? `${accent}16` : 'rgba(255,255,255,0.02)',
            border: `1px solid ${layer2Active ? accent + '55' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: layer2Active ? `0 0 18px ${accent}25` : 'none',
            transition: 'all 0.4s', gap: 2,
          }}>
            <div style={{ color: layer2Active ? accent : '#1e3a5f', fontSize: 10, fontFamily: 'monospace', fontWeight: 700, transition: 'color 0.4s' }}>Linear</div>
            <div style={{ color: layer2Active ? `${accent}99` : '#0f172a', fontSize: 8, fontFamily: 'monospace', transition: 'color 0.4s' }}>Projection</div>
            {layer2Active && (
              <div style={{ width: '70%', height: 2, borderRadius: 1, background: `linear-gradient(to right, transparent, ${accent}, transparent)`, animation: 'adp-pulse 0.7s ease-in-out 0.1s infinite' }} />
            )}
          </div>

          <div style={{ color: '#64748b', fontSize: 8, fontFamily: 'monospace', textAlign: 'center' }}>2-Layer MLP</div>
        </div>

        {/* Arrow */}
        <div style={{ color: outputActive ? accent : '#1e3a5f', fontSize: 20, transition: 'color 0.4s' }}>→</div>

        {/* Output: LM token sequence */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 120 }}>
          <div style={{
            width: '100%', padding: '10px 10px', borderRadius: 10,
            background: outputActive ? `${accent}10` : 'rgba(255,255,255,0.02)',
            border: `1px solid ${outputActive ? accent + '40' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: outputActive ? `0 0 20px ${accent}20` : 'none',
            display: 'flex', flexDirection: 'column', gap: 5,
            transition: 'all 0.4s',
          }}>
            {/* sep token */}
            <div style={{
              padding: '3px 6px', borderRadius: 4, fontSize: 8, fontFamily: 'monospace',
              background: outputActive ? `${accentAmber}18` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${outputActive ? accentAmber + '40' : 'rgba(255,255,255,0.05)'}`,
              color: outputActive ? accentAmber : '#0f172a',
              transition: 'all 0.4s',
            }}>
              &lt;view_sep&gt;
            </div>
            {/* token rows */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 2 }}>
              {Array.from({ length: 20 }, (_, i) => (
                <div key={i} style={{
                  height: 7, borderRadius: 1,
                  background: outputActive ? `${accent}80` : 'rgba(255,255,255,0.04)',
                  transition: 'background 0.2s',
                  transitionDelay: `${i * 20}ms`,
                }} />
              ))}
            </div>
            {/* newline token */}
            <div style={{
              padding: '3px 6px', borderRadius: 4, fontSize: 8, fontFamily: 'monospace',
              background: outputActive ? `${accentCyan}15` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${outputActive ? accentCyan + '40' : 'rgba(255,255,255,0.05)'}`,
              color: outputActive ? accentCyan : '#0f172a',
              transition: 'all 0.4s',
            }}>
              &lt;tile_newline&gt;
            </div>
          </div>
          <div style={{ color: outputActive ? '#94a3b8' : '#1e3a5f', fontSize: 9, fontFamily: 'monospace', transition: 'color 0.4s', textAlign: 'center' }}>
            LM Embedding<br />Space
          </div>
        </div>
      </div>

      {/* Bottom status */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(5,10,20,0.8)', backdropFilter: 'blur(8px)',
        border: `1px solid ${accent}15`, borderRadius: 8, padding: '7px 16px',
        color: step >= 0 ? accent : '#334155', fontSize: 10, fontFamily: 'monospace',
        letterSpacing: 1, transition: 'color 0.3s', whiteSpace: 'nowrap',
      }}>
        {step >= 0 ? `▸  ${ADAPTER_STEPS[step].label.toUpperCase()}` : 'PRESS RUN INFERENCE TO START'}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [baselineData, setBaselineData] = useState<ModelConfig | null>(null);
  const [pruned40Data, setPruned40Data] = useState<ModelConfig | null>(null);
  const [pruned80Data, setPruned80Data] = useState<ModelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'baseline' | 'pruned40' | 'pruned80'>('baseline');
  const [activeChapter, setActiveChapter] = useState('moe');

  useEffect(() => {
    async function loadData() {
      try {
        const [baseline, pruned40, pruned80] = await Promise.all([
          fetch('/data/baseline.json').then(r => r.json()),
          fetch('/data/pruned40.json').then(r => r.json()),
          fetch('/data/pruned80.json').then(r => r.json()),
        ]);
        setBaselineData(baseline);
        setPruned40Data(pruned40);
        setPruned80Data(pruned80);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => { setActiveChapter('moe'); }, [activeTab]);

  const dataMap = { baseline: baselineData, pruned40: pruned40Data, pruned80: pruned80Data };
  const activeTabConfig = MODEL_TABS.find(t => t.id === activeTab)!;
  const activeData = dataMap[activeTab];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030712' }}>
        <GridBackground />
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 20px', border: '2px solid rgba(56,189,248,0.3)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: 13, letterSpacing: 2 }}>LOADING MODELS...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#030712', position: 'relative' }}>
      <GridBackground />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1600, margin: '0 auto', padding: '0 24px 60px' }}>

        {/* ── Header ── */}
        <header style={{ paddingTop: 40, paddingBottom: 32, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 100, padding: '5px 14px', marginBottom: 20 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 6px #22d3ee' }} />
            <span style={{ color: '#38bdf8', fontSize: 11, fontFamily: 'monospace', letterSpacing: 2 }}>ICDAR 2026 · SUBMISSION</span>
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 64px)', fontWeight: 800, fontFamily: '"Courier New", monospace', letterSpacing: -2, margin: '0 0 10px', background: 'linear-gradient(135deg, #f1f5f9 0%, #38bdf8 40%, #a78bfa 70%, #f472b6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1.1 }}>
            LiteDoc
          </h1>
          <p style={{ color: '#ffffff', fontSize: 14, fontFamily: 'monospace', letterSpacing: 3, marginBottom: 6 }}>DISTILLING LARGE DOCUMENT MODELS INTO EFFICIENT TASK-SPECIFIC ENCODERS</p>
          <p style={{ color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 28 }}>DeepSeek-VL2 · CKA Expert Pruning · Sparse-to-Sparse KD · MoE Architecture</p>
          <Link href="/chat" style={{ textDecoration: 'none' }}>
            <button style={{ background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(167,139,250,0.15))', border: '1px solid rgba(56,189,248,0.35)', color: '#e2e8f0', borderRadius: 10, padding: '12px 28px', fontSize: 13, fontFamily: 'monospace', letterSpacing: 1, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={16} color="#38bdf8" />CHAT WITH LITEDOC<ChevronRight size={14} color="#ffffff" />
            </button>
          </Link>
        </header>

        {/* ── Key Metrics ── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32, padding: '20px 24px', background: 'rgba(5,10,25,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(56,189,248,0.08)', borderRadius: 14 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ color: '#ffffff', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 10 }}>KEY RESULTS · 80% PRUNING</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <PerfBadge value="89.6%" label="Teacher Perf. Retained" accent="#22d3ee" />
              <PerfBadge value="2.4×" label="Compression" accent="#a78bfa" />
              <PerfBadge value="−39.8%" label="VRAM Reduction" accent="#f472b6" />
              <PerfBadge value="+51.7%" label="Throughput Gain" accent="#34d399" />
            </div>
          </div>
          <div style={{ width: 1, background: 'rgba(56,189,248,0.1)', alignSelf: 'stretch', margin: '0 8px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
            <div style={{ color: '#ffffff', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 6 }}>BENCHMARKS (80% KD)</div>
            {[{ label: 'DocVQA', val: 82.13, max: 88.76 }, { label: 'FUNSD', val: 80.44, max: 87.59 }, { label: 'RVL-CDIP', val: 82.67, max: 91.15 }].map(({ label, val, max }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#ffffff', fontSize: 10, fontFamily: 'monospace', width: 72 }}>{label}</span>
                <div style={{ width: 140, height: 4, background: 'rgba(56,189,248,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${(val / max) * 100}%`, height: '100%', background: 'linear-gradient(to right, #38bdf8, #a78bfa)', borderRadius: 2 }} />
                </div>
                <span style={{ color: '#ffffff', fontSize: 10, fontFamily: 'monospace' }}>{val.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tab Selector ── */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: 'rgba(5,10,20,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(56,189,248,0.08)', borderRadius: 12, padding: 4 }}>
          {MODEL_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ flex: 1, padding: '12px 16px', borderRadius: 9, border: isActive ? `1px solid ${tab.accentBorder}` : '1px solid transparent', background: isActive ? tab.accentDim : 'transparent', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ color: isActive ? tab.accent : '#ffffff', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}>{tab.label}</span>
                <span style={{ color: isActive ? `${tab.accent}cc` : '#cbd5e1', fontSize: 10, fontFamily: 'monospace' }}>{tab.sublabel}</span>
              </button>
            );
          })}
        </div>

        {/* ── Active tab content ── */}
        {activeData && (() => {
          const tab = activeTabConfig;
          const chapter = ARCHITECTURE_CHAPTERS.find(c => c.id === activeChapter)!;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Description bar */}
              <div style={{ background: 'rgba(5,10,20,0.7)', backdropFilter: 'blur(12px)', border: `1px solid ${tab.accentBorder}`, borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: tab.accent, boxShadow: `0 0 8px ${tab.accent}`, flexShrink: 0 }} />
                <div>
                  <div style={{ color: tab.accent, fontSize: 13, fontFamily: 'monospace', fontWeight: 700, marginBottom: 2 }}>{activeData.name}</div>
                  <div style={{ color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace' }}>{tab.description}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  {tab.stats.map(({ icon: Icon, value, label }) => (
                    <div key={label} style={{ background: `${tab.accent}0c`, border: `1px solid ${tab.accent}20`, borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon size={12} color={tab.accent} />
                      <div>
                        <div style={{ color: tab.accent, fontSize: 12, fontFamily: 'monospace', fontWeight: 700, lineHeight: 1 }}>{value}</div>
                        <div style={{ color: '#ffffff', fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model Stats */}
              <div style={{ background: 'rgba(5,10,20,0.7)', backdropFilter: 'blur(12px)', border: `1px solid rgba(56,189,248,0.08)`, borderRadius: 14, padding: 24 }}>
                <SectionHeading icon={BarChart3} label="Model Statistics" accent={tab.accent} />
                <ModelStats modelData={activeData} />
              </div>

              {/* ── Interactive Architecture Viewer ── */}
              <div style={{
                background: 'rgba(5,10,20,0.7)', backdropFilter: 'blur(12px)',
                border: `1px solid rgba(56,189,248,0.08)`, borderRadius: 14, overflow: 'hidden',
                display: 'flex', height: 660,
              }}>
                {/* Left Sidebar */}
                <div style={{ width: 300, background: 'rgba(5,10,20,0.95)', borderRight: '1px solid rgba(56,189,248,0.08)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '20px 20px 8px' }}>
                    <div style={{ color: '#38bdf8', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 10 }}>TABLE OF CONTENTS</div>
                    <ArchitectureMiniMap activeId={activeChapter} onSelect={setActiveChapter} />
                  </div>
                  <div style={{ height: 1, background: 'rgba(56,189,248,0.08)', margin: '12px 20px' }} />
                  <div style={{ flex: 1, padding: '12px 20px 16px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
                    <div style={{ color: '#fff', fontSize: 15, fontFamily: 'monospace', fontWeight: 700 }}>{chapter.label}</div>
                    <div style={{ color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace', lineHeight: 1.6 }}>{chapter.description}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                      {chapter.details.map((detail, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <div style={{ width: 4, height: 4, borderRadius: '50%', background: chapter.color, marginTop: 6, flexShrink: 0 }} />
                          <span style={{ color: '#cbd5e1', fontSize: 11, fontFamily: 'monospace', lineHeight: 1.5 }}>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(56,189,248,0.08)', background: 'rgba(5,10,20,0.6)' }}>
                    <div style={{ color: '#94a3b8', fontSize: 10, fontFamily: 'monospace', lineHeight: 1.4 }}>
                      Select a component above to inspect its role in the DeepSeek-VL2 pipeline.
                    </div>
                  </div>
                </div>

                {/* Right Stage */}
                <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {activeChapter === 'tiling' && <DynamicTilingStage />}
                  {activeChapter === 'adapter' && <VLAdapterStage />}
                  {activeChapter === 'moe' && (
                    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, pointerEvents: 'none' }}>
                        <div style={{ color: '#f472b6', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 }}>COMPONENT</div>
                        <div style={{ color: '#fff', fontSize: 18, fontFamily: 'monospace', fontWeight: 700, marginTop: 2 }}>DeepSeekMoE</div>
                      </div>
                      <MoEArchitecture3D modelData={activeData} />
                    </div>
                  )}
                </div>
              </div>

            </div>
          );
        })()}

        {/* ── Footer ── */}
        <footer style={{ marginTop: 60, textAlign: 'center', borderTop: '1px solid rgba(56,189,248,0.06)', paddingTop: 32 }}>
          <div style={{ color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace', letterSpacing: 1 }}>LiteDoc: Distilling Large Document Models into Efficient Task-Specific Encoders</div>
          <div style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace', marginTop: 4 }}>ICDAR 2026 · DeepSeek-VL2 · CKA Expert Pruning · S2S Knowledge Distillation</div>
        </footer>
      </div>
    </div>
  );
}