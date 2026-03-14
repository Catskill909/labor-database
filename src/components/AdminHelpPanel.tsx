import { useState } from 'react';
import { X, Compass, Search, MousePointerClick, Edit3, Sparkles, Plus, Download, Lightbulb, ChevronRight } from 'lucide-react';

const sections = [
  {
    id: 'start',
    icon: Compass,
    title: 'Getting Started',
    content: [
      'This dashboard lets you manage all entries in the Labor Arts & Culture Database — history events, quotes, music, and films.',
      'The three cards at the top show your Published count, Review Queue (pending entries), and a search bar.',
      'Click a stats card to filter the table. Click it again to clear the filter.',
      'Use the category tabs (All, History, Quotes, Music, Films) to browse by type.',
    ],
  },
  {
    id: 'browse',
    icon: Search,
    title: 'Browsing & Finding Entries',
    content: [
      'The search bar finds entries by title, creator, or tag — just start typing.',
      'Category tabs filter by type. The active tab is highlighted.',
      'The sort dropdown (right side of the tab row) changes the table order — newest first, alphabetical, by year, etc.',
      'The table auto-loads more entries as you scroll down. No need to click "next page."',
    ],
  },
  {
    id: 'actions',
    icon: MousePointerClick,
    title: 'Entry Actions (The Icon Row)',
    content: [
      'Each entry row has action icons on the right side:',
      '👁 Eye — Preview how the public sees this entry.',
      '✏️ Pencil — Edit the entry (opens the full edit form).',
      '👁‍🗨 Eye-slash — Publish or Unpublish. This is a single click — no confirmation.',
      '🗑 Trash — Delete the entry. You\'ll be asked to confirm.',
      '👤 Purple person icon — Shows submitter info (only on user-submitted entries).',
      '✨ Gold sparkle — Means this entry has been through the research tool.',
    ],
  },
  {
    id: 'edit',
    icon: Edit3,
    title: 'Editing an Entry',
    content: [
      'Click the pencil icon on any entry to open the edit form.',
      'History & Quotes use a two-column layout: core fields on the left, research fields on the right.',
      'Music & Films use a single-column form with a collapsible "Research & Links" section.',
      'Tags: click to add (max 5 per entry). Click the X on a tag to remove it.',
      'Images: drag & drop or click to upload. Hover over an existing image to see the delete option.',
      'Click "Apply to Record" (the red button) to save your changes.',
      'If you close the form without saving, you\'ll be warned about unsaved changes.',
    ],
  },
  {
    id: 'ai',
    icon: Sparkles,
    title: 'AI Research Tool',
    content: [
      'Open any entry for editing, then click the "Research" button at the top to launch the AI assistant.',
      'Click "Scan with AI" to generate suggestions. This takes 5–10 seconds.',
      'The left panel shows your live record — you can edit fields directly.',
      'The right panel shows AI suggestions. Review each one, then click "Add to..." to accept it.',
      'You can edit the AI\'s text before adding it to your record.',
      'When you\'re done, click "Apply to Record" to save everything back to the edit form.',
      'The AI is a starting point — always review and refine before publishing.',
      'Use the length (Short / Detailed) and tone (Factual / Narrative) toggles to adjust the output.',
    ],
  },
  {
    id: 'add',
    icon: Plus,
    title: 'Adding New Entries',
    content: [
      'Click "Add to Database" (the red button at the top of the page).',
      'Step 1: Pick a category (History, Quote, Music, or Film).',
      'Step 2: Fill in the form. The fields change depending on the category.',
      'For Music: type a song name in the search box to auto-fill details from Genius.',
      'For Films: type a film name to auto-fill details from TMDB.',
      'The "Research & Links" section at the bottom is optional — expand it to add Wikipedia links, related links, or research notes.',
      'New entries added by admin are Published by default.',
    ],
  },
  {
    id: 'export',
    icon: Download,
    title: 'Export & Import',
    content: [
      'Export: Click the "Export" button and choose a format:',
      '• Full Backup (ZIP) — complete database + images, for backup or migration.',
      '• JSON — data file that can be re-imported later.',
      '• XLSX — spreadsheet with one sheet per category.',
      '• CSV — universal format for any spreadsheet app.',
      'Import: Click "Import" and select a ZIP or JSON file. Progress shows in real-time as entries are processed.',
      'Import uses smart merge — it updates existing entries and adds new ones without creating duplicates.',
    ],
  },
  {
    id: 'tips',
    icon: Lightbulb,
    title: 'Quick Tips',
    content: [
      'Publish/Unpublish is instant — there\'s no confirmation dialog. Click again to undo.',
      'The public site only shows Published entries. Pending entries are only visible here.',
      'User submissions from the public site appear in the Review Queue with "Pending" status.',
      'Research fields (Wikipedia, Quick Facts, etc.) only show on the public site if they have content. Empty fields are automatically hidden.',
      'The gold sparkle badge in the entry row means it\'s been through the research tool.',
      'You can run the research tool on the same entry multiple times to refine results.',
    ],
  },
];

export default function AdminHelpPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [openSection, setOpenSection] = useState<string | null>('start');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-[420px] bg-zinc-900 border-l border-white/10 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white">Help</h2>
            <p className="text-xs text-gray-500 mt-0.5">Admin Guide for Curators</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto">
          {sections.map((section) => {
            const Icon = section.icon;
            const isOpen = openSection === section.id;
            return (
              <div key={section.id} className="border-b border-white/5">
                <button
                  onClick={() => setOpenSection(isOpen ? null : section.id)}
                  className={`w-full flex items-center gap-3 px-6 py-3.5 text-left transition-colors ${
                    isOpen ? 'bg-white/5 text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <Icon size={16} className={isOpen ? 'text-red-400' : 'text-gray-500'} />
                  <span className="text-sm font-medium flex-1">{section.title}</span>
                  <ChevronRight
                    size={14}
                    className={`text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-4 pt-1">
                    <ul className="space-y-2.5">
                      {section.content.map((line, i) => (
                        <li key={i} className="text-sm text-gray-400 leading-relaxed pl-7">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 text-center">
          <p className="text-xs text-gray-600">Labor Arts & Culture Database</p>
        </div>
      </div>
    </div>
  );
}
