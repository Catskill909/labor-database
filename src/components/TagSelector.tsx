import { X } from 'lucide-react';

interface TagGroup {
  name: string;
  tags: string[];
}

interface TagSelectorProps {
  value: string;
  onChange: (tags: string) => void;
  maxTags?: number;
  className?: string;
}

const TAG_GROUPS: TagGroup[] = [
  {
    name: 'Theme',
    tags: [
      'Strikes & Lockouts',
      'Organizing',
      'Collective Bargaining',
      'Labor Law & Legislation',
      'Wages & Benefits',
      'Working Conditions',
      'Worker Safety & Health',
      'Child Labor',
      'Unemployment',
      'Automation & Technology',
      'Globalization & Outsourcing',
      'Labor Culture & Arts',
      'International Solidarity',
    ],
  },
  {
    name: 'Industry',
    tags: [
      'Mining',
      'Steel & Manufacturing',
      'Textiles & Garment',
      'Agriculture & Farm Work',
      'Auto & Transportation',
      'Construction',
      'Public Sector',
      'Education & Teachers',
      'Healthcare',
      'Entertainment & Media',
      'Service & Retail',
      'Maritime & Dockworkers',
      'Domestic Workers',
    ],
  },
  {
    name: 'Social',
    tags: [
      'Civil Rights & Race',
      'Women & Gender',
      'Immigration',
      'War & Military',
      'Socialism & Left Politics',
      'Environment',
      'Working Class',
      'Politics & Elections',
    ],
  },
];

export default function TagSelector({ value, onChange, maxTags = 5, className = '' }: TagSelectorProps) {
  const selectedTags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      const newTags = selectedTags.filter(t => t !== tag);
      onChange(newTags.join(', '));
    } else if (selectedTags.length < maxTags) {
      onChange([...selectedTags, tag].join(', '));
    }
  };

  const clearAll = () => {
    onChange('');
  };

  return (
    <div className={`bg-white/5 border border-white/10 rounded-lg p-3 ${className}`}>
      {/* Header with explanation */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400">
          Click to select up to {maxTags} tags from our Labor taxonomy
        </p>
        {selectedTags.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
          >
            <X size={10} />
            Clear ({selectedTags.length})
          </button>
        )}
      </div>

      {/* All tags grouped - always visible */}
      <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
        {TAG_GROUPS.map(group => (
          <div key={group.name}>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1.5">
              {group.name}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {group.tags.map(tag => {
                const isSelected = selectedTags.includes(tag);
                const isDisabled = !isSelected && selectedTags.length >= maxTags;

                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => !isDisabled && toggleTag(tag)}
                    disabled={isDisabled}
                    className={`px-2 py-0.5 rounded text-[11px] transition-all ${
                      isSelected
                        ? 'bg-red-500/25 border border-red-500/50 text-red-300 font-medium'
                        : isDisabled
                          ? 'bg-white/5 border border-white/5 text-gray-600 cursor-not-allowed'
                          : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
