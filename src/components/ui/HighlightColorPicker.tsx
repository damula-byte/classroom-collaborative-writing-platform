import React from 'react';
import { HighlightColor, WRITESPACE_HIGHLIGHT_COLORS } from '@/types';
import { cn } from '@/utils';

interface HighlightColorPickerProps {
  value: HighlightColor;
  onChange: (color: HighlightColor) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

const COLORS: HighlightColor[] = ['orange', 'yellow', 'green', 'blue', 'purple', 'pink'];

export const HighlightColorPicker: React.FC<HighlightColorPickerProps> = ({
  value,
  onChange,
  disabled = false,
  size = 'md',
}) => {
  return (
    <div className="inline-flex items-center gap-1.5" role="radiogroup" aria-label="Highlight color">
      {COLORS.map((color) => {
        const meta = WRITESPACE_HIGHLIGHT_COLORS[color];
        const selected = value === color;
        return (
          <button
            key={color}
            type="button"
            disabled={disabled}
            onClick={() => onChange(color)}
            aria-label={meta.label}
            aria-checked={selected}
            role="radio"
            title={meta.label}
            className={cn(
              'rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1',
              size === 'sm' ? 'h-5 w-5' : 'h-6 w-6',
              meta.swatch,
              selected ? 'ring-2 ring-slate-900 ring-offset-1 scale-110' : 'opacity-80 hover:opacity-100'
            )}
          />
        );
      })}
    </div>
  );
};
