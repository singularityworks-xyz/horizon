import { ReactNode } from 'react';

interface ProgressBarProps {
  percentage: number; // 0-100
  label?: string;
  className?: string;
}

export function ProgressBar({ percentage, label, className = '' }: ProgressBarProps) {
  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  // Determine color based on progress
  let colorClass = 'bg-gray-400';
  if (clampedPercentage >= 71) {
    colorClass = 'bg-green-500';
  } else if (clampedPercentage >= 31) {
    colorClass = 'bg-yellow-500';
  }

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm text-gray-500" aria-live="polite">
            {clampedPercentage}%
          </span>
        </div>
      )}
      <div
        className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden"
        role="progressbar"
        aria-valuenow={clampedPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={
          label
            ? `${label}: ${clampedPercentage}% complete`
            : `Progress: ${clampedPercentage}% complete`
        }
      >
        <div
          className={`h-full ${colorClass} transition-all duration-300 ease-out rounded-full`}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
    </div>
  );
}
