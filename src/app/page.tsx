'use client';
import Link from 'next/link';
import { MessageSquare, Zap, Cpu, BarChart3, GitBranch, ChevronRight, Activity } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import MoEArchitecture3D from '@/components/visualizations/MoEArchitecture3D';
import ModelStats from '@/components/visualizations/ModelStats';
import ExpertRetentionChart from '@/components/visualizations/ExpertRetentionChart';
import { ModelConfig } from '@/types/model';
import { Loader2 } from 'lucide-react';

// ─── Animated grid background ────────────────────────────────────────────────
function GridBackground() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none',
    }}>
      {/* Deep space gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(15,30,80,0.6) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(50,10,80,0.4) 0%, transparent 60%), #030712',
      }} />
      {/* Grid lines */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.06 }}>
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#38bdf8" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Scanline overlay */}
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [baselineData, setBaselineData] = useState<ModelConfig | null>(null);
  const [pruned40Data, setPruned40Data] = useState<ModelConfig | null>(null);
  const [pruned80Data, setPruned80Data] = useState<ModelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'baseline' | 'pruned40' | 'pruned80'>('baseline');
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
          {/* Badge */}
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

          {/* Title */}
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

          {/* CTA */}
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
                {/* Mini stat pills */}
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

              {/* 3D Architecture */}
              <div style={{
                background: 'rgba(5,10,20,0.7)', backdropFilter: 'blur(12px)',
                border: `1px solid rgba(56,189,248,0.08)`, borderRadius: 14, padding: 24,
              }}>
                <SectionHeading icon={Cpu} label="3D Architecture · Token Routing" accent={tab.accent} />
                <div style={{ color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace', marginBottom: 14 }}>
                  Hover a layer to inspect its CKA similarity matrix · Run inference to see token flow
                </div>
                <MoEArchitecture3D modelData={activeData} />
              </div>

              {/* Expert Retention Chart */}
              {/* <div style={{
                background: 'rgba(5,10,20,0.7)', backdropFilter: 'blur(12px)',
                border: `1px solid rgba(56,189,248,0.08)`, borderRadius: 14, padding: 24,
              }}>
                <SectionHeading icon={Activity} label="Expert Retention per Layer" accent={tab.accent} />
                <ExpertRetentionChart modelData={activeData} />
              </div> */}

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