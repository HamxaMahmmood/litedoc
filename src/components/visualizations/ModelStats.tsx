'use client';

import { ModelConfig } from '@/types/model';
import { TrendingUp, Zap, Database, Cpu } from 'lucide-react';

interface ModelStatsProps {
  modelData: ModelConfig;
  accent: string;
}

export default function ModelStats({ modelData, accent }: ModelStatsProps) {
  const statCards = [
    {
      label: 'Compression',
      value: `${modelData.compressionRatio}×`,
      note: `${modelData.totalParams} total`,
      icon: Database,
      accent: '#22d3ee',
    },
    {
      label: 'Avg Score',
      value: modelData.performanceScore,
      note: 'Across 7 benchmarks',
      icon: TrendingUp,
      accent: '#34d399',
    },
    {
      label: 'VRAM Usage',
      value: modelData.vramUsage,
      note: 'Peak memory',
      icon: Cpu,
      accent: '#a78bfa',
    },
    {
      label: 'Throughput',
      value: modelData.throughput,
      note: 'Inference speed',
      icon: Zap,
      accent: '#f472b6',
    },
  ] as const;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
      {statCards.map((card) => (
        <div
          key={card.label}
          style={{
            background: 'linear-gradient(135deg, rgba(5,10,25,0.9) 0%, rgba(10,20,40,0.8) 100%)',
            border: `1px solid ${accent}22`,
            borderRadius: 12,
            padding: '18px 20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 80,
              height: 80,
              background: `radial-gradient(circle, ${card.accent}18 0%, transparent 70%)`,
              borderRadius: '0 12px 0 80px',
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <card.icon size={18} color={card.accent} />
              <span style={{ color: card.accent, fontSize: 22, fontWeight: 700, fontFamily: 'monospace', letterSpacing: -1 }}>{card.value}</span>
            </div>
            <p style={{ color: '#ffffff', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>{card.label}</p>
            <p style={{ color: '#cbd5e1', fontSize: 10, fontFamily: 'monospace', marginTop: 4 }}>{card.note}</p>
          </div>
        </div>
      ))}
    </div>
  );
}