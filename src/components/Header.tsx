import { useState, useRef, useEffect } from 'react';
import { Search, Plus, Database, Menu, Building2, Landmark, Info, ExternalLink, Shield } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import AboutModal from './AboutModal';
import PrivacyModal from './PrivacyModal';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onAddClick: () => void;
}

export default function Header({ searchQuery, setSearchQuery, onAddClick }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // Close menu when clicking outside
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
      <header className="border-b border-white/5 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <Database size={28} className="text-red-400" />
            <h1 className="text-xl font-bold tracking-tight">Labor Arts &amp; Culture Database</h1>
          </div>

          <div className="flex-1 w-full sm:max-w-xl">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search all categories..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm placeholder:text-gray-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/25 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <button
              onClick={onAddClick}
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
            >
              <Plus size={16} />
              Add to Database
            </button>

            {/* Hamburger Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-2 rounded-lg transition-all border ${isMenuOpen ? 'bg-zinc-700 text-white border-white/20' : 'bg-zinc-800 text-gray-400 hover:text-white border-white/5 hover:bg-zinc-700'}`}
              >
                <Menu size={20} />
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-2 w-64 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden py-2 z-50"
                  >
                    <div className="px-4 py-2 mb-2 border-b border-white/5">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Menu</p>
                    </div>

                    <a
                      href="https://www.laborheritage.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-left px-4 py-3 hover:bg-zinc-800 flex items-center gap-3 text-sm text-gray-200 transition-colors group"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="p-1.5 bg-red-500/10 rounded-md text-red-400 group-hover:bg-red-500/20 transition-colors">
                        <Building2 size={16} />
                      </div>
                      <span>Labor Heritage Foundation</span>
                      <ExternalLink size={12} className="ml-auto text-gray-600 group-hover:text-gray-400" />
                    </a>

                    <a
                      href="https://labor-landmarks.supersoul.top/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full text-left px-4 py-3 hover:bg-zinc-800 flex items-center gap-3 text-sm text-gray-200 transition-colors group"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="p-1.5 bg-red-500/10 rounded-md text-red-400 group-hover:bg-red-500/20 transition-colors">
                        <Landmark size={16} />
                      </div>
                      <span>Labor Landmarks</span>
                      <ExternalLink size={12} className="ml-auto text-gray-600 group-hover:text-gray-400" />
                    </a>

                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsAboutOpen(true);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-zinc-800 flex items-center gap-3 text-sm text-gray-200 transition-colors group"
                    >
                      <div className="p-1.5 bg-green-500/10 rounded-md text-green-400 group-hover:bg-green-500/20 transition-colors">
                        <Info size={16} />
                      </div>
                      <span>About Labor Database</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsPrivacyOpen(true);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-zinc-800 flex items-center gap-3 text-sm text-gray-200 transition-colors group"
                    >
                      <div className="p-1.5 bg-green-500/10 rounded-md text-green-400 group-hover:bg-green-500/20 transition-colors">
                        <Shield size={16} />
                      </div>
                      <span>Privacy Policy</span>
                    </button>

                    {/* Mobile Only: Add to Database */}
                    <div className="sm:hidden pt-2 mt-2 border-t border-white/5">
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          onAddClick();
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-zinc-800 flex items-center gap-3 text-sm text-gray-200 transition-colors"
                      >
                        <div className="p-1.5 bg-red-500/10 rounded-md text-red-400">
                          <Plus size={16} />
                        </div>
                        <span>Add to Database</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </>
  );
}
