'use client';
import Link from 'next/link';
import { MessageSquare, Zap, Cpu, BarChart3, GitBranch, ChevronRight, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import MoEArchitecture3D from '@/components/visualizations/MoEArchitecture3D';
import ModelStats from '@/components/visualizations/ModelStats';
import { ModelConfig } from '@/types/model';
import { Loader2 } from 'lucide-react';

// ─── Animated grid background ────────────────────────────────────────────────
function GridBackground() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none',
    }}>
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

// ─── Glowing stat card ────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, accent }: { icon: any; value: string; label: string; accent: string }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, rgba(5,10,25,0.9) 0%, rgba(10,20,40,0.8) 100%)`,
      border: `1px solid ${accent}22`,
      borderRadius: 12,
      padding: '18px 20px',
      position: 'relative',
      overflow: 'hidden',
      flex: 1,
      minWidth: 120,
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 80, height: 80,
        background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
        borderRadius: '0 12px 0 80px',
      }} />
      <div style={{ color: accent, marginBottom: 8, opacity: 0.9 }}>
        <Icon size={18} />
      </div>
      <div style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, fontFamily: 'monospace', letterSpacing: -1 }}>
        {value}
      </div>
      <div style={{ color: '#ffffff', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

// ─── Model tab config ─────────────────────────────────────────────────────────
const MODEL_TABS = [
  {
    id: 'baseline',
    label: 'BASELINE',
    sublabel: '0% pruned',
    accent: '#38bdf8',
    accentDim: 'rgba(56,189,248,0.12)',
    accentBorder: 'rgba(56,189,248,0.3)',
    description: 'Full DeepSeek-VL2 Tiny · 64 experts/layer · 3.37B params',
    dataKey: 'baseline' as const,
    stats: [
      { icon: Cpu, value: '3.37B', label: 'Parameters' },
      { icon: GitBranch, value: '64', label: 'Experts/Layer' },
      { icon: Zap, value: '1.0×', label: 'Compression' },
      { icon: Activity, value: '12.3GB', label: 'VRAM' },
    ],
  },
  {
    id: 'pruned40',
    label: '40% PRUNED',
    sublabel: 'LiteDoc-60',
    accent: '#a78bfa',
    accentDim: 'rgba(167,139,250,0.10)',
    accentBorder: 'rgba(167,139,250,0.28)',
    description: 'CKA pruned · ~38 experts/layer · 2.4B params · 1.4× compression',
    dataKey: 'pruned40' as const,
    stats: [
      { icon: Cpu, value: '2.4B', label: 'Parameters' },
      { icon: GitBranch, value: '~38', label: 'Experts/Layer' },
      { icon: Zap, value: '1.4×', label: 'Compression' },
      { icon: Activity, value: '9.8GB', label: 'VRAM' },
    ],
  },
  {
    id: 'pruned80',
    label: '80% PRUNED',
    sublabel: 'LiteDoc-20',
    accent: '#f472b6',
    accentDim: 'rgba(244,114,182,0.10)',
    accentBorder: 'rgba(244,114,182,0.28)',
    description: 'Aggressive CKA pruning · ~13 experts/layer · 1.4B params · 2.4× compression',
    dataKey: 'pruned80' as const,
    stats: [
      { icon: Cpu, value: '1.4B', label: 'Parameters' },
      { icon: GitBranch, value: '~13', label: 'Experts/Layer' },
      { icon: Zap, value: '2.4×', label: 'Compression' },
      { icon: Activity, value: '7.4GB', label: 'VRAM' },
    ],
  },
];

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ icon: Icon, label, accent }: { icon: any; label: string; accent: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: `${accent}18`, border: `1px solid ${accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent,
      }}>
        <Icon size={16} />
      </div>
      <span style={{ color: '#ffffff', fontSize: 12, fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${accent}20, transparent)` }} />
    </div>
  );
}

// ─── Performance badge ────────────────────────────────────────────────────────
function PerfBadge({ value, label, accent }: { value: string; label: string; accent: string }) {
  return (
    <div style={{
      background: `${accent}10`, border: `1px solid ${accent}25`,
      borderRadius: 8, padding: '8px 14px', display: 'inline-flex',
      flexDirection: 'column', alignItems: 'center', gap: 2,
    }}>
      <span style={{ color: accent, fontSize: 15, fontWeight: 700, fontFamily: 'monospace' }}>{value}</span>
      <span style={{ color: '#ffffff', fontSize: 10, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  NEW: Architecture Chapter Data & Visualisations
// ═══════════════════════════════════════════════════════════════════════════════

const ARCHITECTURE_CHAPTERS = [
  {
    id: 'tiling',
    label: 'Dynamic Tiling',
    sub: 'SigLIP 384²',
    color: '#38bdf8',
    description:
      'High-resolution images are dynamically split into local tiles using a SigLIP-SO400M-384 encoder. Candidate resolutions minimise padding for arbitrary aspect ratios.',
    details: [
      'Candidate set: (m·384, n·384) where mn ≤ 9',
      'Global thumbnail + m×n local tiles processed independently',
      'Each tile yields 27×27 = 729 visual embeddings',
      'Selected resolution minimises padded area',
    ],
  },
  {
    id: 'adapter',
    label: 'VL Adapter',
    sub: '2-Layer MLP',
    color: '#a78bfa',
    description:
      'A 2-layer MLP projector with 2×2 pixel shuffle compresses visual tokens and injects special separator tokens before feeding into the language model.',
    details: [
      'Pixel shuffle: 27×27 → 14×14 tokens per tile',
      'Special tokens: <tile_newline> and <view_separator>',
      'Projects visual features into LLM embedding space',
      'Total visual tokens: 210 + 1 + m·14×(n·14+1)',
    ],
  },
  {
    id: 'moe',
    label: 'DeepSeekMoE',
    sub: '64 Experts',
    color: '#f472b6',
    description:
      'Mixture-of-Experts decoder with Multi-head Latent Attention. 64 routed + 2 shared experts per layer with top-6 routing and auxiliary-loss-free load balancing.',
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
        <button
          key={layer.id}
          onClick={() => onSelect(layer.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: `1px solid ${activeId === layer.id ? layer.color + '40' : 'transparent'}`,
            background: activeId === layer.id ? layer.color + '12' : 'transparent',
            cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
          }}
        >
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
            <div style={{
              color: activeId === layer.id ? '#fff' : '#cbd5e1',
              fontSize: 12, fontFamily: 'monospace', fontWeight: 600,
            }}>
              {layer.label}
            </div>
            <div style={{
              color: activeId === layer.id ? layer.color : '#64748b',
              fontSize: 9, fontFamily: 'monospace', marginTop: 1,
            }}>
              {layer.sub}
            </div>
          </div>
          {activeId === layer.id && (
            <div style={{ width: 3, height: 20, borderRadius: 2, background: layer.color, flexShrink: 0 }} />
          )}
        </button>
      ))}
    </div>
  );
}

function DynamicTilingStage() {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: 'radial-gradient(ellipse at 30% 40%, rgba(14,30,60,0.9) 0%, rgba(3,7,18,1) 100%)',
      overflow: 'hidden',
    }}>
      {/* faint grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.05,
        backgroundImage: 'linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* header */}
      <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ color: '#38bdf8', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 }}>COMPONENT</div>
        <div style={{ color: '#fff', fontSize: 20, fontFamily: 'monospace', fontWeight: 700, marginTop: 4 }}>Dynamic Tiling</div>
      </div>

      {/* Input image mock */}
      <div style={{
        position: 'absolute', top: '50%', left: '34%', transform: 'translate(-50%, -50%)',
        width: 260, height: 180, borderRadius: 8,
        background: 'linear-gradient(135deg, #1e3a5f, #0f172a)',
        border: '1px solid rgba(56,189,248,0.3)',
        boxShadow: '0 0 40px rgba(56,189,248,0.1)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: 16, opacity: 0.5 }}>
          <div style={{ width: '55%', height: 6, background: '#38bdf8', borderRadius: 3, marginBottom: 6 }} />
          <div style={{ width: '35%', height: 6, background: '#38bdf8', borderRadius: 3, marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 50, height: 50, background: 'rgba(56,189,248,0.2)', borderRadius: 4 }} />
            <div style={{ width: 50, height: 50, background: 'rgba(56,189,248,0.2)', borderRadius: 4 }} />
            <div style={{ width: 50, height: 50, background: 'rgba(56,189,248,0.2)', borderRadius: 4 }} />
          </div>
        </div>
        {/* tile grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr',
        }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              border: '1px solid rgba(56,189,248,0.35)',
              background: 'rgba(56,189,248,0.06)',
            }} />
          ))}
        </div>
        <div style={{
          position: 'absolute', bottom: -22, left: '50%', transform: 'translateX(-50%)',
          color: '#38bdf8', fontSize: 10, fontFamily: 'monospace', whiteSpace: 'nowrap',
        }}>
          Input Image (2×3 tiles)
        </div>
      </div>

      {/* arrow */}
      <div style={{
        position: 'absolute', top: '50%', left: '52%', transform: 'translateY(-50%)',
        color: '#38bdf8', fontSize: 22, fontFamily: 'monospace', opacity: 0.8,
      }}>
        →
      </div>

      {/* Output tiles */}
      <div style={{
        position: 'absolute', top: '50%', right: 50, transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center',
      }}>
        {/* global thumbnail */}
        <div style={{
          width: 110, height: 80, borderRadius: 6,
          background: 'linear-gradient(135deg, #f59e0b15, #f59e0b05)',
          border: '1px solid rgba(245,158,11,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(245,158,11,0.08)',
        }}>
          <span style={{ color: '#fbbf24', fontSize: 10, fontFamily: 'monospace' }}>Global Thumb</span>
        </div>

        {/* local tile grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              width: 34, height: 34, borderRadius: 4,
              background: 'rgba(56,189,248,0.12)',
              border: '1px solid rgba(56,189,248,0.3)',
            }} />
          ))}
        </div>
        <div style={{ color: '#38bdf8', fontSize: 10, fontFamily: 'monospace' }}>Local Tiles</div>
      </div>

      {/* resolution badge */}
      <div style={{
        position: 'absolute', bottom: 36, left: 36,
        background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
        borderRadius: 8, padding: '10px 14px',
      }}>
        <div style={{ color: '#38bdf8', fontSize: 9, fontFamily: 'monospace', marginBottom: 2, letterSpacing: 1 }}>
          SELECTED RESOLUTION
        </div>
        <div style={{ color: '#fff', fontSize: 15, fontFamily: 'monospace', fontWeight: 700 }}>
          768 × 1152
        </div>
        <div style={{ color: '#94a3b8', fontSize: 9, fontFamily: 'monospace', marginTop: 2 }}>
          m=2, n=3, mn=6 ≤ 9
        </div>
      </div>
    </div>
  );
}

function VLAdapterStage() {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: 'radial-gradient(ellipse at 30% 40%, rgba(14,30,60,0.9) 0%, rgba(3,7,18,1) 100%)',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.05,
        backgroundImage: 'linear-gradient(#a78bfa 1px, transparent 1px), linear-gradient(90deg, #a78bfa 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ color: '#a78bfa', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 }}>COMPONENT</div>
        <div style={{ color: '#fff', fontSize: 20, fontFamily: 'monospace', fontWeight: 700, marginTop: 4 }}>VL Adapter</div>
      </div>

      {/* Input tokens */}
      <div style={{
        position: 'absolute', top: '50%', left: 50, transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {[...Array(14)].map((_, i) => (
            <div key={i} style={{
              width: 14, height: 14, borderRadius: 2,
              background: 'rgba(167,139,250,0.25)',
              border: '1px solid rgba(167,139,250,0.45)',
            }} />
          ))}
        </div>
        <div style={{ color: '#a78bfa', fontSize: 10, fontFamily: 'monospace' }}>14 × 14 tokens</div>
      </div>

      {/* arrow */}
      <div style={{
        position: 'absolute', top: '50%', left: '38%', transform: 'translateY(-50%)',
        color: '#a78bfa', fontSize: 22, opacity: 0.8,
      }}>
        →
      </div>

      {/* MLP block */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 130, height: 100, display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{
          flex: 1, borderRadius: 8,
          background: 'rgba(167,139,250,0.08)',
          border: '1px solid rgba(167,139,250,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#a78bfa', fontSize: 10, fontFamily: 'monospace',
        }}>
          Linear + GELU
        </div>
        <div style={{
          flex: 1, borderRadius: 8,
          background: 'rgba(167,139,250,0.08)',
          border: '1px solid rgba(167,139,250,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#a78bfa', fontSize: 10, fontFamily: 'monospace',
        }}>
          Linear Proj
        </div>
        <div style={{ color: '#a78bfa', fontSize: 10, fontFamily: 'monospace', textAlign: 'center' }}>
          2-Layer MLP
        </div>
      </div>

      {/* arrow */}
      <div style={{
        position: 'absolute', top: '50%', right: '30%', transform: 'translateY(-50%)',
        color: '#a78bfa', fontSize: 22, opacity: 0.8,
      }}>
        →
      </div>

      {/* Output sequence */}
      <div style={{
        position: 'absolute', top: '50%', right: 50, transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: 5, width: 170,
      }}>
        <div style={{
          background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)',
          borderRadius: 4, padding: '4px 8px', color: '#fbbf24',
          fontSize: 10, fontFamily: 'monospace',
        }}>
          &lt;view_separator&gt;
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3 }}>
          {[...Array(15)].map((_, i) => (
            <div key={i} style={{
              width: '100%', height: 18, borderRadius: 2,
              background: 'rgba(167,139,250,0.18)',
              border: '1px solid rgba(167,139,250,0.3)',
            }} />
          ))}
        </div>
        <div style={{
          background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.35)',
          borderRadius: 4, padding: '4px 8px', color: '#38bdf8',
          fontSize: 10, fontFamily: 'monospace',
        }}>
          &lt;tile_newline&gt;
        </div>
        <div style={{ color: '#a78bfa', fontSize: 10, fontFamily: 'monospace', textAlign: 'center', marginTop: 4 }}>
          LM Embedding Space
        </div>
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  // Reset chapter to MoE when switching model tabs
  useEffect(() => {
    setActiveChapter('moe');
  }, [activeTab]);

  const dataMap = { baseline: baselineData, pruned40: pruned40Data, pruned80: pruned80Data };
  const activeTabConfig = MODEL_TABS.find(t => t.id === activeTab)!;
  const activeData = dataMap[activeTab];

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#030712',
      }}>
        <GridBackground />
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 64, height: 64, margin: '0 auto 20px',
            border: '2px solid rgba(56,189,248,0.3)',
            borderTopColor: '#38bdf8', borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: 13, letterSpacing: 2 }}>
            LOADING MODELS...
          </p>
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
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
            borderRadius: 100, padding: '5px 14px', marginBottom: 20,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 6px #22d3ee' }} />
            <span style={{ color: '#38bdf8', fontSize: 11, fontFamily: 'monospace', letterSpacing: 2 }}>
              ICDAR 2026 · SUBMISSION
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 6vw, 64px)',
            fontWeight: 800,
            fontFamily: '"Courier New", monospace',
            letterSpacing: -2,
            margin: '0 0 10px',
            background: 'linear-gradient(135deg, #f1f5f9 0%, #38bdf8 40%, #a78bfa 70%, #f472b6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.1,
          }}>
            LiteDoc
          </h1>

          <p style={{
            color: '#ffffff', fontSize: 14, fontFamily: 'monospace',
            letterSpacing: 3, marginBottom: 6,
          }}>
            DISTILLING LARGE DOCUMENT MODELS INTO EFFICIENT TASK-SPECIFIC ENCODERS
          </p>

          <p style={{ color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 28 }}>
            DeepSeek-VL2 · CKA Expert Pruning · Sparse-to-Sparse KD · MoE Architecture
          </p>

          <Link href="/chat" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(167,139,250,0.15))',
              border: '1px solid rgba(56,189,248,0.35)',
              color: '#e2e8f0', borderRadius: 10, padding: '12px 28px',
              fontSize: 13, fontFamily: 'monospace', letterSpacing: 1,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s',
            }}>
              <MessageSquare size={16} color="#38bdf8" />
              CHAT WITH LITEDOC
              <ChevronRight size={14} color="#ffffff" />
            </button>
          </Link>
        </header>

        {/* ── Key Metrics Row ── */}
        <div style={{
          display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32,
          padding: '20px 24px',
          background: 'rgba(5,10,25,0.6)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(56,189,248,0.08)', borderRadius: 14,
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ color: '#ffffff', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 10 }}>
              KEY RESULTS · 80% PRUNING
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <PerfBadge value="89.6%" label="Teacher Perf. Retained" accent="#22d3ee" />
              <PerfBadge value="2.4×" label="Compression" accent="#a78bfa" />
              <PerfBadge value="−39.8%" label="VRAM Reduction" accent="#f472b6" />
              <PerfBadge value="+51.7%" label="Throughput Gain" accent="#34d399" />
            </div>
          </div>
          <div style={{
            width: 1, background: 'rgba(56,189,248,0.1)',
            alignSelf: 'stretch', margin: '0 8px',
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
            <div style={{ color: '#ffffff', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 6 }}>
              BENCHMARKS (80% KD)
            </div>
            {[
              { label: 'DocVQA', val: 82.13, max: 88.76 },
              { label: 'FUNSD', val: 80.44, max: 87.59 },
              { label: 'RVL-CDIP', val: 82.67, max: 91.15 },
            ].map(({ label, val, max }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#ffffff', fontSize: 10, fontFamily: 'monospace', width: 72 }}>{label}</span>
                <div style={{ width: 140, height: 4, background: 'rgba(56,189,248,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(val / max) * 100}%`, height: '100%',
                    background: 'linear-gradient(to right, #38bdf8, #a78bfa)',
                    borderRadius: 2,
                  }} />
                </div>
                <span style={{ color: '#ffffff', fontSize: 10, fontFamily: 'monospace' }}>{val.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tab Selector ── */}
        <div style={{
          display: 'flex', gap: 2, marginBottom: 24,
          background: 'rgba(5,10,20,0.8)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(56,189,248,0.08)', borderRadius: 12, padding: 4,
        }}>
          {MODEL_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 9,
                  border: isActive ? `1px solid ${tab.accentBorder}` : '1px solid transparent',
                  background: isActive ? tab.accentDim : 'transparent',
                  cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}
              >
                <span style={{
                  color: isActive ? tab.accent : '#ffffff',
                  fontSize: 12, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1,
                }}>
                  {tab.label}
                </span>
                <span style={{ color: isActive ? `${tab.accent}cc` : '#cbd5e1', fontSize: 10, fontFamily: 'monospace' }}>
                  {tab.sublabel}
                </span>
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
              <div style={{
                background: 'rgba(5,10,20,0.7)', backdropFilter: 'blur(12px)',
                border: `1px solid ${tab.accentBorder}`,
                borderRadius: 12, padding: '14px 20px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: tab.accent, boxShadow: `0 0 8px ${tab.accent}`,
                  flexShrink: 0,
                }} />
                <div>
                  <div style={{ color: tab.accent, fontSize: 13, fontFamily: 'monospace', fontWeight: 700, marginBottom: 2 }}>
                    {activeData.name}
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace' }}>
                    {tab.description}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  {tab.stats.map(({ icon: Icon, value, label }) => (
                    <div key={label} style={{
                      background: `${tab.accent}0c`, border: `1px solid ${tab.accent}20`,
                      borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6,
                    }}>
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
              <div style={{
                background: 'rgba(5,10,20,0.7)', backdropFilter: 'blur(12px)',
                border: `1px solid rgba(56,189,248,0.08)`, borderRadius: 14, padding: 24,
              }}>
                <SectionHeading icon={BarChart3} label="Model Statistics" accent={tab.accent} />
                <ModelStats modelData={activeData} />
              </div>

              {/* ═══════════════════════════════════════════════════════════════
                  NEW: Interactive Architecture Chapter Viewer
                  ═══════════════════════════════════════════════════════════════ */}
                            <div style={{
                background: 'rgba(5,10,20,0.7)', backdropFilter: 'blur(12px)',
                border: `1px solid rgba(56,189,248,0.08)`, borderRadius: 14, overflow: 'hidden',
                display: 'flex',
                // CRITICAL FIX: give the flex container a definite height so the
                // right-hand stage (and therefore the 3D canvas) knows how tall
                // it should be when NOT in fullscreen.
                height: 660,
              }}>
                {/* ── Left Sidebar ── */}
                <div style={{
                  width: 300, background: 'rgba(5,10,20,0.95)',
                  borderRight: '1px solid rgba(56,189,248,0.08)',
                  display: 'flex', flexDirection: 'column',
                }}>
                  {/* Sidebar header */}
                  <div style={{ padding: '20px 20px 8px' }}>
                    <div style={{
                      color: '#38bdf8', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 10,
                    }}>
                      TABLE OF CONTENTS
                    </div>
                    <ArchitectureMiniMap activeId={activeChapter} onSelect={setActiveChapter} />
                  </div>

                  <div style={{ height: 1, background: 'rgba(56,189,248,0.08)', margin: '12px 20px' }} />

                  {/* Chapter info */}
                  <div style={{
                    flex: 1, padding: '12px 20px 16px',
                    display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto',
                  }}>
                    <div style={{ color: '#fff', fontSize: 15, fontFamily: 'monospace', fontWeight: 700 }}>
                      {chapter.label}
                    </div>
                    <div style={{ color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace', lineHeight: 1.6 }}>
                      {chapter.description}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                      {chapter.details.map((detail, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <div style={{
                            width: 4, height: 4, borderRadius: '50%',
                            background: chapter.color, marginTop: 6, flexShrink: 0,
                          }} />
                          <span style={{ color: '#cbd5e1', fontSize: 11, fontFamily: 'monospace', lineHeight: 1.5 }}>
                            {detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom hint */}
                  <div style={{
                    padding: '12px 20px', borderTop: '1px solid rgba(56,189,248,0.08)',
                    background: 'rgba(5,10,20,0.6)',
                  }}>
                    <div style={{ color: '#94a3b8', fontSize: 10, fontFamily: 'monospace', lineHeight: 1.4 }}>
                      Select a component above to inspect its role in the DeepSeek-VL2 pipeline.
                    </div>
                  </div>
                </div>

                               {/* ── Right Stage ── */}
                <div style={{
                  flex: 1,
                  position: 'relative',
                  // CRITICAL FIX: the stage must itself be a flex column so that
                  // the MoE wrapper can fill it with height:100%.
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}>
                  {activeChapter === 'tiling' && <DynamicTilingStage />}
                  {activeChapter === 'adapter' && <VLAdapterStage />}
                                    {activeChapter === 'moe' && (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                      {/* MoE label overlay */}
                      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, pointerEvents: 'none' }}>
                        <div style={{ color: '#f472b6', fontSize: 10, fontFamily: 'monospace', letterSpacing: 2 }}>
                          COMPONENT
                        </div>
                        <div style={{ color: '#fff', fontSize: 20, fontFamily: 'monospace', fontWeight: 700, marginTop: 4 }}>
                          DeepSeekMoE
                        </div>
                      </div>
                      {/* YOUR EXISTING 3D COMPONENT — UNCHANGED */}
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
          <div style={{ color: '#e2e8f0', fontSize: 12, fontFamily: 'monospace', letterSpacing: 1 }}>
            LiteDoc: Distilling Large Document Models into Efficient Task-Specific Encoders
          </div>
          <div style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace', marginTop: 4 }}>
            ICDAR 2026 · DeepSeek-VL2 · CKA Expert Pruning · S2S Knowledge Distillation
          </div>
        </footer>
      </div>
    </div>
  );
}