import { memo } from 'react';
import type { TimeFrame } from '@/types/sector';

interface TimeToggleProps {
  value: TimeFrame;
  onChange: (value: TimeFrame) => void;
}

const options: { label: string; value: TimeFrame }[] = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' },
];

const TimeToggle: React.FC<TimeToggleProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center bg-[rgba(10,15,28,0.8)] border border-[#1F2A40] rounded-full p-1 gap-0.5">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="relative px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-500 cursor-pointer"
            style={{
              color: isActive ? '#02050A' : '#475572',
              backgroundColor: isActive ? '#E0E6F1' : 'transparent',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default memo(TimeToggle);
