import { useState, useEffect, useCallback } from 'react';
import type { SectorData, TimeFrame } from '@/types/sector';

interface AllSectorData {
  [key: string]: SectorData;
}

const API_URL = import.meta.env.VITE_API_URL || '/data/sector_fund_data.json';

export function useSectorData(timeFrame: TimeFrame) {
  const [data, setData] = useState<AllSectorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Failed to load data');
      const raw: AllSectorData = await res.json();
      
      // Transform data based on timeFrame
      const transformed: AllSectorData = {};
      Object.entries(raw).forEach(([sector, sectorData]) => {
        if (timeFrame === 'day') {
          transformed[sector] = sectorData;
        } else if (timeFrame === 'week') {
          transformed[sector] = aggregateWeekly(sectorData);
        } else {
          transformed[sector] = aggregateMonthly(sectorData);
        }
      });
      
      setData(transformed);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [timeFrame]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, reload: loadData };
}

function aggregateWeekly(data: SectorData): SectorData {
  const weeks: { dates: string[]; daily: number[]; cumulative: number[] }[] = [];
  let currentWeek: { dates: string[]; daily: number[]; cumulative: number[] } = { dates: [], daily: [], cumulative: [] };
  
  data.dates.forEach((date, i) => {
    currentWeek.dates.push(date);
    currentWeek.daily.push(data.daily[i]);
    currentWeek.cumulative.push(data.cumulative[i]);
    
    const day = new Date(date).getDay();
    if (day === 5 || i === data.dates.length - 1) {
      weeks.push(currentWeek);
      currentWeek = { dates: [], daily: [], cumulative: [] };
    }
  });
  
  if (currentWeek.dates.length > 0) {
    weeks.push(currentWeek);
  }
  
  return {
    dates: weeks.map(w => w.dates[w.dates.length - 1]),
    daily: weeks.map(w => w.daily.reduce((a, b) => a + b, 0)),
    cumulative: weeks.map(w => w.cumulative[w.cumulative.length - 1]),
  };
}

function aggregateMonthly(data: SectorData): SectorData {
  const months: { dates: string[]; daily: number[]; cumulative: number[] }[] = [];
  let currentMonth: { dates: string[]; daily: number[]; cumulative: number[] } = { dates: [], daily: [], cumulative: [] };
  let currentMonthKey = '';
  
  data.dates.forEach((date, i) => {
    const d = new Date(date);
    const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
    
    if (monthKey !== currentMonthKey && currentMonth.dates.length > 0) {
      months.push(currentMonth);
      currentMonth = { dates: [], daily: [], cumulative: [] };
    }
    currentMonthKey = monthKey;
    currentMonth.dates.push(date);
    currentMonth.daily.push(data.daily[i]);
    currentMonth.cumulative.push(data.cumulative[i]);
  });
  
  if (currentMonth.dates.length > 0) {
    months.push(currentMonth);
  }
  
  return {
    dates: months.map(m => m.dates[m.dates.length - 1]),
    daily: months.map(m => m.daily.reduce((a, b) => a + b, 0)),
    cumulative: months.map(m => m.cumulative[m.cumulative.length - 1]),
  };
}
