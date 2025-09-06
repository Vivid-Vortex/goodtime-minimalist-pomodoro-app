import React, { useState } from 'react';
import { ChevronDown, Tag } from 'lucide-react';
import { useLabelStore, Label } from '../stores/labelStore';

interface LabelSelectorProps {
  onLabelChange?: (label: Label) => void;
  className?: string;
  compact?: boolean;
}

export const LabelSelector: React.FC<LabelSelectorProps> = ({ 
  onLabelChange, 
  className = '',
  compact = false 
}) => {
  const { 
    selectedLabel, 
    setSelectedLabel, 
    getActiveLabels, 
    getLabelColor 
  } = useLabelStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const activeLabels = getActiveLabels();

  const handleSelectLabel = (label: Label) => {
    setSelectedLabel(label.id);
    onLabelChange?.(label);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg 
          hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors w-full text-left
          ${compact ? 'text-sm' : ''}
        `}
      >
        <div
          className="w-3 h-3 rounded-full border border-gray-300"
          style={{ backgroundColor: getLabelColor(selectedLabel.color) }}
        />
        <span className="flex-1 font-medium text-gray-800 dark:text-gray-200 truncate">
          {selectedLabel.title}
        </span>
        <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {activeLabels.length > 0 ? (
              activeLabels.map((label) => (
                <button
                  key={label.id}
                  onClick={() => handleSelectLabel(label)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-600
                    transition-colors border-b border-gray-100 dark:border-gray-600 last:border-b-0
                    ${selectedLabel.id === label.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}
                    ${compact ? 'text-sm' : ''}
                  `}
                >
                  <div
                    className="w-3 h-3 rounded-full border border-gray-300"
                    style={{ backgroundColor: getLabelColor(label.color) }}
                  />
                  <span className="flex-1 font-medium text-gray-800 dark:text-gray-200 truncate">
                    {label.title}
                  </span>
                  {selectedLabel.id === label.id && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-gray-500 text-sm">
                <Tag size={20} className="mx-auto mb-2 text-gray-400" />
                No labels available
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};