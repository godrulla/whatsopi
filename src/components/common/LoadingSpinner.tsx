import React from 'react';
import { cn } from '../../utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  className?: string;
  color?: 'primary' | 'secondary' | 'white';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  className,
  color = 'primary',
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  const colorClasses = {
    primary: 'text-blue-600 dark:text-blue-400',
    secondary: 'text-red-600 dark:text-red-400',
    white: 'text-white',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-3', className)}>
      {/* Dominican flag inspired spinner */}
      <div className="relative">
        <div
          className={cn(
            'animate-spin rounded-full border-4 border-transparent',
            'border-t-blue-600 border-r-white border-b-red-600 border-l-white',
            'dark:border-t-blue-400 dark:border-b-red-400',
            sizeClasses[size]
          )}
        />
        {/* Inner spinner for better visual effect */}
        <div
          className={cn(
            'absolute inset-1 animate-spin rounded-full border-2 border-transparent',
            'border-t-red-400 border-b-blue-400',
            'animate-reverse-spin'
          )}
        />
      </div>

      {message && (
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-xs">
          {message}
        </p>
      )}
    </div>
  );
};

// Alternative simpler spinner for inline use
export const InlineSpinner: React.FC<{ size?: 'sm' | 'md'; className?: string }> = ({
  size = 'sm',
  className,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-transparent',
        'border-t-current border-r-current',
        sizeClasses[size],
        className
      )}
    />
  );
};

// Dominican-themed pulse loader
export const PulseLoader: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('flex space-x-1', className)}>
      <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" />
      <div className="h-2 w-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
      <div className="h-2 w-2 bg-red-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
    </div>
  );
};

// Skeleton loader for content
export const SkeletonLoader: React.FC<{ 
  lines?: number; 
  className?: string;
  height?: string;
}> = ({ 
  lines = 3, 
  className,
  height = 'h-4'
}) => {
  return (
    <div className={cn('animate-pulse space-y-3', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'bg-gray-200 dark:bg-gray-700 rounded',
            height,
            index === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
};