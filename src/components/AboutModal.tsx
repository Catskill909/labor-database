import React from 'react';
import { createPortal } from 'react-dom';
import { X, Mail } from 'lucide-react';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0 bg-zinc-900">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                        About Labor Database
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-gray-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6 overflow-y-auto">
                    <div className="space-y-4 text-gray-300 leading-relaxed">
                        <h3 className="font-bold text-white text-lg">
                            THE LABOR ARTS &amp; CULTURE DATABASE
                        </h3>
                        <p>
                            A comprehensive guide to the cultural heritage of working people — from labor history milestones and inspiring quotes to music, films, plays, and poetry that celebrate the labor movement.
                        </p>
                        <p>
                            A project of the <a href="https://laborheritage.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-medium">Labor Heritage Foundation</a>, it preserves and promotes the rich artistic and cultural traditions of labor, making them accessible to everyone.
                        </p>
                    </div>

                    {/* How to Submit */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-white text-base">How to Submit an Entry</h3>
                        <div className="space-y-2 text-sm text-gray-300">
                            <div className="flex gap-3 items-start">
                                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">1</span>
                                <p>Click <span className="font-bold text-white">"Add to Database"</span> at the top of the page (or in the menu on mobile).</p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">2</span>
                                <p>Choose a category — Labor History, Quotes, Music, Films, and more.</p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">3</span>
                                <p>Fill in the details — title, description, date, and any relevant links or media.</p>
                            </div>
                            <div className="flex gap-3 items-start">
                                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">4</span>
                                <p>Submit your entry. Our team will review it and add it to the database.</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            All submissions are reviewed before being published. Your privacy is fully protected — we never share your information.
                        </p>
                    </div>

                    {/* Footer / Contact */}
                    <div className="pt-6 border-t border-white/5">
                        <p className="text-sm text-gray-400 mb-3">Questions and comments welcome:</p>
                        <a
                            href="mailto:info@laborheritage.org"
                            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium"
                        >
                            <Mail size={16} />
                            info@laborheritage.org
                        </a>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AboutModal;
