import { useState, useCallback, useMemo } from 'react';
import { useSectorData } from '@/hooks/useSectorData';
import { SECTOR_CONFIGS } from '@/types/sector';
import type { TimeFrame } from '@/types/sector';
import OceanWaveChart from '@/sections/OceanWaveChart';
import TagSelector from '@/sections/TagSelector';
import TimeToggle from '@/sections/TimeToggle';
import './App.css';

function App() {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('day');
  const [activeSectors, setActiveSectors] = useState<string[]>(
    SECTOR_CONFIGS.map((c) => c.name)
  );
  const [highlightedSector, setHighlightedSector] = useState<string | null>(null);

  const { data, loading, error } = useSectorData(timeFrame);

  // Sort sector configs by latest cumulative value (descending) when data is available
  const sortedConfigs = useMemo(() => {
    if (!data) return SECTOR_CONFIGS;
    return [...SECTOR_CONFIGS].sort((a, b) => {
      const aData = data[a.name];
      const bData = data[b.name];
      if (!aData || !bData) return 0;
      const aLatest = aData.cumulative[aData.cumulative.length - 1] ?? 0;
      const bLatest = bData.cumulative[bData.cumulative.length - 1] ?? 0;
      return bLatest - aLatest; // descending: highest first
    });
  }, [data]);

  // Keep active sectors in the same order as sortedConfigs (so chart series order matches tag order)
  const sortedActiveSectors = useMemo(() => {
    const activeSet = new Set(activeSectors);
    return sortedConfigs
      .map((c) => c.name)
      .filter((name) => activeSet.has(name));
  }, [activeSectors, sortedConfigs]);

  const handleToggleSector = useCallback((name: string) => {
    setActiveSectors((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setActiveSectors(sortedConfigs.map((c) => c.name));
  }, [sortedConfigs]);

  const handleClearAll = useCallback(() => {
    setActiveSectors([]);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#02050A] text-[#E0E6F1] font-sans overflow-x-hidden relative">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Deep ocean radial glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] opacity-30"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0, 240, 255, 0.06), transparent 70%)',
          }}
        />
        {/* Bottom caustic effect */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[400px] opacity-20"
          style={{
            background: 'radial-gradient(ellipse at 30% 100%, rgba(0, 240, 255, 0.08), transparent 60%), radial-gradient(ellipse at 70% 100%, rgba(88, 86, 214, 0.06), transparent 60%)',
          }}
        />
        {/* Subtle scanline texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)',
          }}
        />
      </div>

      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-[60px] border-b border-[rgba(255,255,255,0.05)]" style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(10, 15, 28, 0.6)' }}>
        <div className="h-full flex items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-[#00F0FF] flex items-center justify-center" style={{ boxShadow: '0 0 12px rgba(0,240,255,0.4)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#02050A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-[0.15em]" style={{ fontFamily: 'Unica One, Noto Sans SC, sans-serif' }}>
                GUANLAN
              </span>
            </div>
            <div className="hidden sm:block w-px h-5 bg-[rgba(71,85,114,0.3)]" />
            <span className="hidden sm:block text-xs text-[#475572] tracking-wider">观澜 · A股海面波浪</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#475572]">
            <span className="hidden md:inline">数据来源: iFinD</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-[rgba(0,240,255,0.1)] text-[#00F0FF] border border-[rgba(0,240,255,0.2)]">LIVE</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 pt-[60px] px-4 lg:px-8 pb-8 min-h-screen flex flex-col">
        {/* Header Section */}
        <div className="py-6 lg:py-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#E0E6F1] mb-2" style={{ fontFamily: 'Noto Sans SC, sans-serif' }}>
                海面曲线波浪
              </h1>
              <p className="text-sm text-[#8A9BB8] max-w-xl leading-relaxed">
                追踪市场主线资金演进，高处浪头是资金涌入的热门板块，低处谷是资金退潮的板块。基于
                <span className="text-[#00F0FF] mx-1">iFinD</span>
                真实行情数据，选取2026年4月底市场热度前十概念板块。
              </p>
            </div>
            <TimeToggle value={timeFrame} onChange={setTimeFrame} />
          </div>
        </div>

        {/* Tag Selector */}
        <div className="mb-4">
          <TagSelector
            configs={sortedConfigs}
            activeSectors={activeSectors}
            onToggle={handleToggleSector}
            onSelectAll={handleSelectAll}
            onClearAll={handleClearAll}
            onHover={setHighlightedSector}
            highlightedSector={highlightedSector}
          />
        </div>

        {/* Chart Card */}
        <div className="mx-auto w-full max-w-[1400px] rounded-xl border border-[rgba(255,255,255,0.06)] relative overflow-hidden" style={{ backgroundColor: 'rgba(10, 15, 28, 0.5)', aspectRatio: '1 / 1', maxHeight: 'calc(100vh - 240px)' }}>
          {/* Card glow border effect */}
          <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: 'inset 0 0 60px rgba(0, 240, 255, 0.02), 0 0 40px rgba(0,0,0,0.5)' }} />
          
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-12 h-12 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-[#00F0FF] to-transparent opacity-40" />
            <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-[#00F0FF] to-transparent opacity-40" />
          </div>
          <div className="absolute top-0 right-0 w-12 h-12 pointer-events-none">
            <div className="absolute top-0 right-0 w-full h-px bg-gradient-to-l from-[#00F0FF] to-transparent opacity-40" />
            <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-[#00F0FF] to-transparent opacity-40" />
          </div>

          {error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-[#FF3B30] text-sm mb-2">数据加载失败</div>
                <div className="text-[#475572] text-xs">{error}</div>
              </div>
            </div>
          ) : (
            <OceanWaveChart
              data={data}
              activeSectors={sortedActiveSectors}
              sectorConfigs={sortedConfigs}
              timeFrame={timeFrame}
              loading={loading}
              highlightedSector={highlightedSector}
              onFocusSector={setHighlightedSector}
            />
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[#475572]">
          <div className="flex items-center gap-4">
            <span>纵轴: 主力资金净流入累计值（亿元）</span>
            <span>横轴: 时间（{timeFrame === 'day' ? '日' : timeFrame === 'week' ? '周' : '月'}）</span>
          </div>
          <div className="flex items-center gap-4">
            <span>悬浮提示：红色=相对昨日流入 / 绿色=相对昨日流出</span>
            <span>数据基于 iFinD 板块代表股价格行情模拟</span>
            <span>更新: 2026-04-30</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
