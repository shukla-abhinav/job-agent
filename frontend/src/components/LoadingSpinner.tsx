interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

export function LoadingSpinner({ size = 'md', label }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-blue-200 border-t-blue-600`}
        role="status"
        aria-label={label ?? 'Loading'}
      />
      {label && (
        <span className="text-sm text-slate-500 animate-pulse">{label}</span>
      )}
    </div>
  );
}
