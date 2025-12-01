import React, { useState, useRef, useEffect } from 'react';
import { Tag, Check, ChevronDown, X } from 'lucide-react';

interface TagFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

const TagFilter: React.FC<TagFilterProps> = ({ availableTags, selectedTags, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-all shadow-sm w-full sm:w-auto justify-center sm:justify-start ${
          selectedTags.length > 0 
            ? 'bg-blue-50 border-blue-200 text-blue-700 ring-2 ring-blue-100 ring-offset-1' 
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Tag size={16} />
        <span>Tags</span>
        {selectedTags.length > 0 && (
          <span className="flex items-center justify-center bg-blue-100 text-blue-700 text-[10px] font-bold h-5 min-w-[20px] px-1 rounded-full">
            {selectedTags.length}
          </span>
        )}
        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-left">
          <div className="p-3 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filter by Tags</span>
            {selectedTags.length > 0 && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onChange([]); }}
                    className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                >
                    Clear <X size={10} />
                </button>
            )}
          </div>
          <div className="p-2 max-h-60 overflow-y-auto custom-scrollbar">
            {availableTags.length === 0 ? (
               <div className="p-4 text-sm text-gray-400 text-center italic">No tags found</div>
            ) : (
                <div className="space-y-1">
                    {availableTags.map(tag => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                            <button
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg transition-colors text-left group ${
                                    isSelected 
                                    ? 'bg-blue-50 text-blue-700 font-medium' 
                                    : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <span>{tag}</span>
                                {isSelected && <Check size={14} className="text-blue-600" />}
                            </button>
                        );
                    })}
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagFilter;