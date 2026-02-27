import React from 'react';
import { createPortal } from 'react-dom';
import { X, Shield } from 'lucide-react';

interface PrivacyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0 bg-zinc-900">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <Shield size={20} className="text-green-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                            Privacy Policy
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-gray-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6 overflow-y-auto">
                    <div className="space-y-5 text-gray-300 leading-relaxed text-sm">
                        <h3 className="font-bold text-white text-base">Your Privacy is Fully Protected</h3>
                        <p>
                            The Labor Heritage Foundation is committed to protecting your privacy. This policy describes how we handle any information collected through the Labor Arts &amp; Culture Database website.
                        </p>

                        <div className="space-y-4">
                            <div className="border-l-2 border-green-500 pl-4 py-2 bg-white/5 rounded-r-lg">
                                <h4 className="font-bold text-white mb-1">No Data Sharing — Period</h4>
                                <p>We do not sell, trade, rent, or share your personal information with any third parties, under any circumstances. Your submitted information is used solely for the purpose of maintaining and improving the Labor Arts &amp; Culture Database.</p>
                            </div>

                            <div className="border-l-2 border-green-500 pl-4 py-2 bg-white/5 rounded-r-lg">
                                <h4 className="font-bold text-white mb-1">Information We Collect</h4>
                                <p>When you submit an entry, we collect only the information you voluntarily provide — such as the title, description, and date. We do not collect personal data beyond what is needed to process your submission.</p>
                            </div>

                            <div className="border-l-2 border-green-500 pl-4 py-2 bg-white/5 rounded-r-lg">
                                <h4 className="font-bold text-white mb-1">No Tracking or Analytics</h4>
                                <p>We do not use cookies, tracking pixels, or third-party analytics services to monitor your browsing behavior on this site.</p>
                            </div>

                            <div className="border-l-2 border-green-500 pl-4 py-2 bg-white/5 rounded-r-lg">
                                <h4 className="font-bold text-white mb-1">Data Security</h4>
                                <p>All submitted information is stored securely and is accessible only to authorized Labor Heritage Foundation administrators for the purpose of curating the database.</p>
                            </div>

                            <div className="border-l-2 border-green-500 pl-4 py-2 bg-white/5 rounded-r-lg">
                                <h4 className="font-bold text-white mb-1">Your Rights</h4>
                                <p>You may request the removal or correction of any information you have submitted at any time by contacting us.</p>
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="pt-4 border-t border-white/5">
                        <p className="text-sm text-gray-400">
                            Questions about our privacy practices? Contact us at{' '}
                            <a
                                href="mailto:info@laborheritage.org"
                                className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                            >
                                info@laborheritage.org
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default PrivacyModal;
