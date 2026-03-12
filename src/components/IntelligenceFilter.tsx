'use client';

import { ReactNode, useState } from 'react';
import {
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export interface FilterConfig {
  type: 'select' | 'search' | 'toggle' | 'custom' | 'date-range' | 'multi-select';
  label: string;
  value: any;
  onChange: (value: any) => void;
  options?: { value: string; label: string }[];
  placeholder?: string;
  icon?: ReactNode;
  className?: string;
  customComponent?: ReactNode;
  showLabel?: boolean;
}

interface IntelligenceFilterProps {
  title?: string;
  subtitle?: string;
  filters: FilterConfig[];
  onReset?: () => void;
  defaultExpanded?: boolean;
  className?: string;
  variant?: 'gradient' | 'solid' | 'minimal';
  showActiveCount?: boolean;
  filterCount?: number;
  filterCountLabel?: string;
}

export default function IntelligenceFilter({
  title = 'Intelligent Filters',
  subtitle = 'Refine your view with precision',
  filters,
  onReset,
  defaultExpanded = true,
  className = '',
  variant = 'gradient',
  showActiveCount = true,
  filterCount,
  filterCountLabel = 'items',
}: IntelligenceFilterProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Count active filters (excluding empty/default values)
  const activeFilterCount = filters.filter(filter => {
    if (filter.type === 'toggle') return filter.value === true;
    if (filter.type === 'search') return filter.value && filter.value.trim() !== '';
    if (filter.type === 'select') return filter.value && filter.value !== 'all' && filter.value !== '';
    if (filter.type === 'multi-select') return filter.value && filter.value.length > 0;
    return false;
  }).length;

  const handleReset = () => {
    filters.forEach(filter => {
      if (filter.type === 'toggle') {
        filter.onChange(false);
      } else if (filter.type === 'search') {
        filter.onChange('');
      } else if (filter.type === 'multi-select') {
        filter.onChange([]);
      } else {
        filter.onChange('all');
      }
    });
    onReset?.();
  };

  // Variant styles
  const variantStyles = {
    gradient: 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-indigo-200',
    solid: 'bg-white border-gray-200',
    minimal: 'bg-gray-50 border-gray-100',
  };

  const headerStyles = {
    gradient: 'bg-gradient-to-r from-indigo-600 to-purple-600',
    solid: 'bg-indigo-600',
    minimal: 'bg-gray-700',
  };

  return (
    <div className={`rounded-xl border shadow-sm transition-all duration-200 ${variantStyles[variant]} ${className}`}>
      {/* Header */}
      <div 
        className={`${headerStyles[variant]} text-white px-6 py-4 rounded-t-xl cursor-pointer select-none`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
              {variant === 'gradient' ? (
                <SparklesIcon className="h-5 w-5" />
              ) : (
                <FunnelIcon className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                {title}
                {showActiveCount && activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/30 backdrop-blur-sm">
                    {activeFilterCount} active
                  </span>
                )}
              </h3>
              {subtitle && (
                <p className="text-xs text-white/80 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-xs font-medium transition-colors"
                title="Reset all filters"
              >
                <XMarkIcon className="h-4 w-4" />
                Reset
              </button>
            )}
            <button
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label={isExpanded ? 'Collapse filters' : 'Expand filters'}
            >
              {isExpanded ? (
                <ChevronUpIcon className="h-5 w-5" />
              ) : (
                <ChevronDownIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Grid */}
      {isExpanded && (
        <div className="p-6 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filters.map((filter, index) => (
              <div key={index} className={filter.className || ''}>
                {filter.type === 'custom' ? (
                  filter.customComponent
                ) : (
                  <>
                    {(filter.showLabel !== false) && (
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        {filter.icon && <span className="text-gray-500">{filter.icon}</span>}
                        {filter.label}
                      </label>
                    )}
                    
                    {filter.type === 'select' && (
                      <select
                        value={filter.value}
                        onChange={(e) => filter.onChange(e.target.value)}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all px-3 py-2.5 text-sm bg-white"
                      >
                        {filter.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {filter.type === 'search' && (
                      <div className="relative">
                        <input
                          type="text"
                          value={filter.value}
                          onChange={(e) => filter.onChange(e.target.value)}
                          placeholder={filter.placeholder || 'Search...'}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all pl-10 pr-3 py-2.5 text-sm"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {filter.icon || (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          )}
                        </div>
                        {filter.value && (
                          <button
                            onClick={() => filter.onChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}

                    {filter.type === 'toggle' && (
                      <label className="flex items-center cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={filter.value}
                            onChange={(e) => filter.onChange(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                          {filter.label}
                        </span>
                      </label>
                    )}

                    {filter.type === 'multi-select' && (
                      <select
                        multiple
                        value={filter.value}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, option => option.value);
                          filter.onChange(selected);
                        }}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all px-3 py-2 text-sm bg-white"
                        size={Math.min(filter.options?.length || 3, 5)}
                      >
                        {filter.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {filter.type === 'date-range' && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={filter.value?.start || ''}
                          onChange={(e) => filter.onChange({ ...filter.value, start: e.target.value })}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all px-3 py-2 text-sm"
                        />
                        <input
                          type="date"
                          value={filter.value?.end || ''}
                          onChange={(e) => filter.onChange({ ...filter.value, end: e.target.value })}
                          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Active Filters Summary */}
          {(activeFilterCount > 0 || filterCount !== undefined) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  {activeFilterCount > 0 && (
                    <span className="text-gray-600 font-medium">
                      {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} applied
                    </span>
                  )}
                  {filterCount !== undefined && (
                    <span className="text-gray-700 font-semibold">
                      Showing {filterCount} {filterCountLabel}
                    </span>
                  )}
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleReset}
                    className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                    Clear all
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
