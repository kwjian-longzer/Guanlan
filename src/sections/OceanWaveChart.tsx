import { useRef, useEffect, useCallback, memo, useState } from 'react';
import * as echarts from 'echarts';
import type { SectorConfig, SectorData, TimeFrame } from '@/types/sector';

interface OceanWaveChartProps {
  data: Record<string, SectorData> | null;
  activeSectors: string[];
  sectorConfigs: SectorConfig[];
  timeFrame: TimeFrame;
  loading?: boolean;
  highlightedSector?: string | null;
  onFocusSector?: (name: string | null) => void;
}

// Simple throttle helper
function throttle<T extends (...args: any[]) => void>(fn: T, wait: number): T {
  let last = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn(...args);
    }
  }) as T;
}

const OceanWaveChart: React.FC<OceanWaveChartProps> = ({
  data,
  activeSectors,
  sectorConfigs,
  timeFrame,
  loading = false,
  highlightedSector,
  onFocusSector,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // Focus: current crosshair position (dateIndex + which sector is "selected")
  const [focus, setFocus] = useState<{ dateIndex: number; sectorIndex: number } | null>(null);
  const focusRef = useRef(focus);
  useEffect(() => { focusRef.current = focus; }, [focus]);

  // Tooltip pixel position + content
  const [tooltipPixel, setTooltipPixel] = useState<[number, number]>([0, 0]);
  const [tooltipInfo, setTooltipInfo] = useState<{
    visible: boolean;
    date: string;
    sectorName: string;
    daily: number;
    cumulative: number;
    color: string;
  } | null>(null);

  // Move axisPointer to a specific data point
  const moveAxisPointer = useCallback((dateIndex: number, sectorIndex: number) => {
    if (!chartInstance.current || !data || activeSectors.length === 0) return;
    const sectorName = activeSectors[sectorIndex];
    const sectorData = data[sectorName];
    if (!sectorData) return;
    const cumulative = sectorData.cumulative[dateIndex];
    if (cumulative == null) return;

    // Dispatch showTip with specific seriesIndex — this moves crosshair to that series's point
    chartInstance.current.dispatchAction({
      type: 'showTip',
      seriesIndex: sectorIndex,
      dataIndex: dateIndex,
    });
  }, [data, activeSectors]);

  // Build ECharts option
  const buildOption = useCallback((): echarts.EChartsOption => {
    if (!data || activeSectors.length === 0) {
      return {
        backgroundColor: 'transparent',
        title: { text: '暂无数据', left: 'center', top: 'center', textStyle: { color: '#475572', fontSize: 16 } },
      };
    }

    const firstSector = activeSectors[0];
    const dates = data[firstSector]?.dates || [];

    const hasHighlight = highlightedSector !== null && highlightedSector !== undefined;

    const series: echarts.SeriesOption[] = activeSectors.map((sectorName) => {
      const config = sectorConfigs.find((c) => c.name === sectorName);
      const sectorData = data[sectorName];
      if (!config || !sectorData) return null;

      const isHighlighted = highlightedSector === sectorName;
      const isDimmed = hasHighlight && !isHighlighted;

      return {
        name: sectorName,
        type: 'line',
        smooth: 0.4,
        symbol: 'none',
        lineStyle: {
          width: isDimmed ? 1.5 : 3,
          color: config.color,
          shadowColor: isDimmed ? 'transparent' : config.glowColor,
          shadowBlur: isDimmed ? 0 : 12,
          shadowOffsetY: isDimmed ? 0 : 4,
          opacity: isDimmed ? 0.15 : 1,
        },
        areaStyle: {
          color: new (echarts as any).graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: config.glowColor },
            { offset: 1, color: 'rgba(0,0,0,0)' },
          ]),
          opacity: isDimmed ? 0.03 : 0.25,
        },
        endLabel: {
          show: true,
          formatter: '{a}',
          color: config.color,
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'Noto Sans SC, sans-serif',
          opacity: isDimmed ? 0.08 : 1,
          offset: [6, 0],
        },
        emphasis: {
          focus: 'series',
          lineStyle: { width: 4, shadowBlur: 20 },
          endLabel: { opacity: 1, fontSize: 13 },
        },
        data: sectorData.cumulative,
        animationDuration: 1200,
        animationEasing: 'cubicOut',
      };
    }).filter(Boolean) as echarts.SeriesOption[];

    return {
      backgroundColor: 'transparent',
      grid: {
        left: 70,
        right: 100,
        top: 30,
        bottom: 50,
        containLabel: false,
      },
      tooltip: {
        showContent: false,
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          lineStyle: {
            color: '#E0E6F1',
            width: 1.5,
            type: [4, 4],
            opacity: 0.8,
          },
          crossStyle: {
            color: '#E0E6F1',
            width: 1.5,
            type: [4, 4],
            opacity: 0.8,
          },
          label: { show: false },
          animation: false,
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLine: { show: true, lineStyle: { color: 'rgba(71, 85, 114, 0.3)' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#475572',
          fontSize: 11,
          fontFamily: 'Noto Sans SC, sans-serif',
          formatter: (value: string) => {
            const d = new Date(value);
            if (timeFrame === 'day') {
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }
            return `${d.getFullYear()}/${d.getMonth() + 1}`;
          },
          hideOverlap: true,
        },
        splitLine: { show: true, lineStyle: { color: 'rgba(71, 85, 114, 0.06)' } },
      },
      yAxis: {
        type: 'value',
        boundaryGap: ['5%', '5%'],
        name: `主力资金净流入累计值（亿元）`,
        nameLocation: 'middle',
        nameGap: 46,
        nameRotate: 90,
        nameTextStyle: {
          color: '#475572',
          fontSize: 11,
          fontFamily: 'Noto Sans SC, sans-serif',
        },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#475572',
          fontSize: 11,
          fontFamily: 'Noto Sans SC, sans-serif',
          formatter: (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(0)}`,
        },
        splitLine: {
          show: true,
          lineStyle: { color: 'rgba(71, 85, 114, 0.1)', type: 'dashed' },
        },
      },
      labelLayout: { hideOverlap: true },
      series,
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut',
    };
  }, [data, activeSectors, sectorConfigs, timeFrame, highlightedSector]);

  // Init chart + event listeners
  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, undefined, {
        renderer: 'canvas',
      });
    }

    const option = buildOption();
    chartInstance.current.setOption(option, true);

    // ---- Mouse move: find closest sector by pixel distance ----
    const handleZrMouseMove = throttle((params: any) => {
      if (!chartInstance.current || !data || activeSectors.length === 0) return;

      const mouseX = params.offsetX;
      const mouseY = params.offsetY;

      // Convert pixel to grid data coordinates
      const gridPoint = chartInstance.current.convertFromPixel('grid', [mouseX, mouseY]);
      if (!gridPoint || gridPoint[0] == null || gridPoint[1] == null) return;

      const dates = data[activeSectors[0]]?.dates || [];
      const rawIdx = gridPoint[0];
      const dateIndex = Math.max(0, Math.min(dates.length - 1, Math.round(rawIdx)));

      // Find closest sector by comparing pixel Y distance at this date index
      let closestSectorIdx = 0;
      let minPixelDiff = Infinity;

      activeSectors.forEach((name, idx) => {
        const sectorData = data[name];
        if (!sectorData) return;
        const val = sectorData.cumulative[dateIndex];
        if (val == null) return;
        const pixel = chartInstance.current!.convertToPixel('grid', [dateIndex, val]);
        if (!pixel) return;
        const diff = Math.abs(pixel[1] - mouseY);
        if (diff < minPixelDiff) {
          minPixelDiff = diff;
          closestSectorIdx = idx;
        }
      });

      setFocus({ dateIndex, sectorIndex: closestSectorIdx });
      moveAxisPointer(dateIndex, closestSectorIdx);
      onFocusSector?.(activeSectors[closestSectorIdx]);
    }, 40); // ~25fps

    // ---- Mouse leave: hide focus ----
    const handleZrMouseLeave = () => {
      setFocus(null);
      onFocusSector?.(null);
      if (chartInstance.current) {
        chartInstance.current.dispatchAction({ type: 'hideTip' });
      }
    };

    // ---- Keyboard navigation ----
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!focusRef.current || !data || activeSectors.length === 0) return;

      const dates = data[activeSectors[0]]?.dates || [];
      const { dateIndex, sectorIndex } = focusRef.current;
      let newDateIdx = dateIndex;
      let newSectorIdx = sectorIndex;
      let changed = false;

      switch (e.key) {
        case 'ArrowLeft':
          newDateIdx = Math.max(0, dateIndex - 1);
          changed = true;
          break;
        case 'ArrowRight':
          newDateIdx = Math.min(dates.length - 1, dateIndex + 1);
          changed = true;
          break;
        case 'ArrowUp':
          newSectorIdx = Math.max(0, sectorIndex - 1);
          changed = true;
          break;
        case 'ArrowDown':
          newSectorIdx = Math.min(activeSectors.length - 1, sectorIndex + 1);
          changed = true;
          break;
      }

      if (changed) {
        e.preventDefault();
        setFocus({ dateIndex: newDateIdx, sectorIndex: newSectorIdx });
        moveAxisPointer(newDateIdx, newSectorIdx);
        // When sector changes via keyboard, highlight only that curve (same as mouse hover)
        onFocusSector?.(activeSectors[newSectorIdx]);
      }
    };

    // Bind events
    const zr = chartInstance.current.getZr();
    zr.on('mousemove', handleZrMouseMove);
    zr.on('mouseout', handleZrMouseLeave);

    const el = chartRef.current;
    el.setAttribute('tabindex', '0');
    el.style.outline = 'none';
    el.addEventListener('keydown', handleKeyDown);

    // Auto focus on mount so keyboard works immediately
    el.focus({ preventScroll: true });

    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      zr.off('mousemove', handleZrMouseMove);
      zr.off('mouseout', handleZrMouseLeave);
      el.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [buildOption, data, activeSectors, sectorConfigs, moveAxisPointer, onFocusSector]);

  // Update tooltip pixel & content when focus changes
  useEffect(() => {
    if (!chartInstance.current || !focus || !data || activeSectors.length === 0) {
      setTooltipInfo(null);
      return;
    }

    const { dateIndex, sectorIndex } = focus;
    const sectorName = activeSectors[sectorIndex];
    if (!sectorName) {
      setTooltipInfo(null);
      return;
    }

    const config = sectorConfigs.find((c) => c.name === sectorName);
    const sectorData = data[sectorName];
    if (!config || !sectorData) {
      setTooltipInfo(null);
      return;
    }

    const date = sectorData.dates[dateIndex];
    const cumulative = sectorData.cumulative[dateIndex];
    const daily = sectorData.daily[dateIndex];

    if (date == null || cumulative == null) {
      setTooltipInfo(null);
      return;
    }

    // Get pixel position of the focused data point
    const pixel = chartInstance.current.convertToPixel('grid', [dateIndex, cumulative]);
    if (!pixel) {
      setTooltipInfo(null);
      return;
    }

    setTooltipPixel(pixel as [number, number]);
    setTooltipInfo({
      visible: true,
      date,
      sectorName,
      daily,
      cumulative,
      color: config.color,
    });
  }, [focus, data, activeSectors, sectorConfigs]);

  // Reset focus when activeSectors changes to avoid out-of-bounds
  useEffect(() => {
    if (!data || activeSectors.length === 0) {
      setFocus(null);
      return;
    }
    const dates = data[activeSectors[0]]?.dates || [];
    setFocus((prev) => {
      if (!prev) {
        // Default to last date, first sector
        return { dateIndex: Math.max(0, dates.length - 1), sectorIndex: 0 };
      }
      return {
        dateIndex: Math.min(prev.dateIndex, dates.length - 1),
        sectorIndex: Math.min(prev.sectorIndex, activeSectors.length - 1),
      };
    });
  }, [data, activeSectors]);

  // Update chart option when dependencies change
  useEffect(() => {
    if (!chartInstance.current) return;
    const option = buildOption();
    chartInstance.current.setOption(option, { notMerge: true });
  }, [buildOption]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  // Tooltip positioning: keep it within viewport
  const tooltipX = tooltipPixel[0];
  const tooltipY = tooltipPixel[1];

  // Determine tooltip placement (right if near left edge, left if near right edge)
  const showRight = tooltipX < 300;

  return (
    <div className="relative w-full h-full" style={{ minHeight: '520px' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" style={{ boxShadow: '0 0 12px rgba(0,240,255,0.3)' }} />
            <span className="text-[#8A9BB8] text-sm font-mono">加载数据中...</span>
          </div>
        </div>
      )}

      {/* Chart canvas */}
      <div
        ref={chartRef}
        className="w-full h-full"
        style={{
          minHeight: '520px',
          outline: 'none',
          cursor: 'crosshair',
        }}
      />

      {/* Focus dot at crosshair intersection */}
      {tooltipInfo?.visible && (
        <div
          className="absolute pointer-events-none z-20"
          style={{
            left: tooltipX - 5,
            top: tooltipY - 5,
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: tooltipInfo.color,
            boxShadow: `0 0 10px ${tooltipInfo.color}, 0 0 20px ${tooltipInfo.color}40`,
            border: '2px solid #02050A',
          }}
        />
      )}

      {/* Custom Tooltip */}
      {tooltipInfo?.visible && (
        <div
          className="absolute z-30 pointer-events-none"
          style={{
            left: showRight ? tooltipX + 20 : undefined,
            right: showRight ? undefined : Math.max(0, window.innerWidth - tooltipX - 20),
            top: Math.max(8, tooltipY - 90),
            transition: 'left 0.1s, top 0.1s',
          }}
        >
          <div
            className="rounded-lg px-4 py-3"
            style={{
              backgroundColor: 'rgba(2, 5, 10, 0.94)',
              border: `1px solid ${tooltipInfo.color}60`,
              boxShadow: `0 0 20px ${tooltipInfo.color}20, 0 4px 20px rgba(0,0,0,0.5)`,
              minWidth: 160,
            }}
          >
            {/* Date */}
            <div className="text-[11px] text-[#475572] mb-1.5 font-medium tracking-wide">
              {tooltipInfo.date}
            </div>

            {/* Sector name with color dot */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: tooltipInfo.color,
                  boxShadow: `0 0 6px ${tooltipInfo.color}`,
                }}
              />
              <span className="text-[13px] font-bold text-[#E0E6F1]">
                {tooltipInfo.sectorName}
              </span>
            </div>

            {/* Daily flow: red=inflow, green=outflow (A股 convention) */}
            <div className="flex items-baseline gap-1">
              <span
                className="text-[18px] font-bold tabular-nums"
                style={{
                  color: tooltipInfo.daily >= 0 ? '#FF3B30' : '#34C759',
                }}
              >
                {tooltipInfo.daily >= 0 ? '+' : ''}{tooltipInfo.daily.toFixed(2)}
              </span>
              <span className="text-[11px] text-[#8A9BB8]">亿</span>
            </div>

            {/* Cumulative subtitle */}
            <div className="text-[11px] text-[#475572] mt-1">
              累计 {tooltipInfo.cumulative >= 0 ? '+' : ''}{tooltipInfo.cumulative.toFixed(1)} 亿
            </div>

            {/* Flow direction label */}
            <div
              className="text-[10px] mt-1.5 pt-1.5"
              style={{
                color: tooltipInfo.daily >= 0 ? '#FF3B3050' : '#34C75950',
                borderTop: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {tooltipInfo.daily >= 0 ? '▲ 相对昨日流入' : '▼ 相对昨日流出'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(OceanWaveChart);
