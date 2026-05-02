export interface SectorData {
  dates: string[];
  daily: number[];
  cumulative: number[];
}

export interface SectorConfig {
  name: string;
  color: string;
  glowColor: string;
}

export const SECTOR_CONFIGS: SectorConfig[] = [
  { name: 'CPO/光模块', color: '#00F0FF', glowColor: 'rgba(0, 240, 255, 0.4)' },
  { name: 'AI算力', color: '#FF9500', glowColor: 'rgba(255, 149, 0, 0.4)' },
  { name: '机器人', color: '#FFD60A', glowColor: 'rgba(255, 214, 10, 0.4)' },
  { name: '低空经济', color: '#64D2FF', glowColor: 'rgba(100, 210, 255, 0.4)' },
  { name: '液冷服务器', color: '#5856D6', glowColor: 'rgba(88, 86, 214, 0.4)' },
  { name: '稀土永磁', color: '#BF5AF2', glowColor: 'rgba(191, 90, 242, 0.4)' },
  { name: '锂电/能源金属', color: '#34C759', glowColor: 'rgba(52, 199, 89, 0.4)' },
  { name: '芯片半导体', color: '#FF3B30', glowColor: 'rgba(255, 59, 48, 0.4)' },
  { name: '商业航天', color: '#FF2D55', glowColor: 'rgba(255, 45, 85, 0.4)' },
];

export type TimeFrame = 'day' | 'week' | 'month';
