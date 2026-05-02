import { memo } from 'react';
import type { SectorConfig } from '@/types/sector';

interface TagSelectorProps {
  configs: SectorConfig[];
  activeSectors: string[];
  onToggle: (name: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onHover?: (name: string | null) => void;
  highlightedSector?: string | null;
}

const TagSelector: React.FC<TagSelectorProps> = ({
  configs,
  activeSectors,
  onToggle,
  onSelectAll,
  onClearAll,
  onHover,
  highlightedSector,
}) => {
  const allSelected = activeSectors.length === configs.length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={allSelected ? onClearAll : onSelectAll}
        className="px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 border"
        style={{
          backgroundColor: allSelected ? 'rgba(224, 230, 241, 0.1)' : 'transparent',
          borderColor: 'rgba(224, 230, 241, 0.15)',
          color: allSelected ? '#E0E6F1' : '#8A9BB8',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(224, 230, 241, 0.3)';
          e.currentTarget.style.backgroundColor = 'rgba(224, 230, 241, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(224, 230, 241, 0.15)';
          e.currentTarget.style.backgroundColor = allSelected ? 'rgba(224, 230, 241, 0.1)' : 'transparent';
        }}
      >
        {allSelected ? '全部取消' : '全部选中'}
      </button>

      <div className="w-px h-5 bg-[rgba(71,85,114,0.3)] mx-1" />

      {configs.map((config) => {
        const isActive = activeSectors.includes(config.name);
        const isHighlighted = highlightedSector === config.name;
        return (
          <button
            key={config.name}
            onClick={() => onToggle(config.name)}
            onMouseEnter={() => onHover?.(config.name)}
            onMouseLeave={() => onHover?.(null)}
            className="group relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all duration-300 cursor-pointer border"
            style={{
              backgroundColor: isActive ? `${config.color}15` : 'transparent',
              borderColor: isHighlighted ? config.color : isActive ? `${config.color}40` : 'rgba(71, 85, 114, 0.2)',
              color: isHighlighted ? config.color : isActive ? config.color : '#8A9BB8',
              boxShadow: isHighlighted ? `0 0 12px ${config.glowColor}, inset 0 0 8px ${config.glowColor}` : 'none',
              transform: isHighlighted ? 'scale(1.05)' : 'scale(1)',
              zIndex: isHighlighted ? 10 : 1,
            }}
          >
            <span
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor: isActive || isHighlighted ? config.color : '#475572',
                boxShadow: isActive || isHighlighted ? `0 0 8px ${config.color}` : 'none',
              }}
            />
            <span className="font-medium">{config.name}</span>
            {isHighlighted && (
              <span
                className="absolute inset-0 rounded-md pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, ${config.glowColor}30, transparent 70%)`,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default memo(TagSelector);
