import React from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, AlertCircle, Plus, Link2, HelpCircle } from 'lucide-react';

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CONTACT_EMAIL = 'info@laborheritage.org';

/**
 * The body template is the point of this modal.
 *
 * Entries have no individual URLs yet, so someone reporting a problem cannot
 * paste a link — they have to describe the record. Without prompting, that
 * arrives as "the miners film is wrong", which costs whoever reads it a search.
 * Asking for the title and category up front turns a vague report into an
 * actionable one, and costs the sender nothing.
 */
const MAIL_SUBJECT = 'Labor Database — correction or comment';

const MAIL_BODY = [
    'WHICH ENTRY IS THIS ABOUT?',
    '(Please give the title, and whether it is Labor History, a Quote, Music or a Film.',
    'Skip this if your message is not about a particular entry.)',
    '',
    '',
    'WHAT WOULD YOU LIKE TO TELL US?',
    '',
    '',
    'DO YOU HAVE A SOURCE WE CAN CHECK?',
    '(A link or a book reference — helpful, but not required.)',
    '',
    '',
    '—',
    'Sent from the Labor Arts & Culture Database',
].join('\n');

const mailtoHref =
    `mailto:${CONTACT_EMAIL}` +
    `?subject=${encodeURIComponent(MAIL_SUBJECT)}` +
    `&body=${encodeURIComponent(MAIL_BODY)}`;

const WELCOME: { icon: React.ReactNode; text: string }[] = [
    { icon: <AlertCircle size={14} />, text: 'A correction to something we have wrong — a date, a name, a detail' },
    { icon: <Plus size={14} />, text: 'A film, song, quote or event we are missing' },
    { icon: <Link2 size={14} />, text: 'A link or video that no longer works' },
    { icon: <HelpCircle size={14} />, text: 'A question about the collection, or how to use it' },
];

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0 bg-zinc-900">
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">
                        Contact &amp; Corrections
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
                    <p className="text-gray-300 leading-relaxed">
                        This collection is built and maintained by people, and people get things
                        wrong. If you spot a mistake — or know of something we are missing — we
                        would genuinely like to hear from you.
                    </p>

                    <div className="space-y-3">
                        <h3 className="font-bold text-white text-base">What to send us</h3>
                        <ul className="space-y-2 text-sm text-gray-300">
                            {WELCOME.map(item => (
                                <li key={item.text} className="flex gap-3 items-start">
                                    <span className="shrink-0 mt-0.5 text-red-400">{item.icon}</span>
                                    <span>{item.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-gray-300">
                            <span className="font-semibold text-white">If it is about a particular entry,
                            please tell us its title</span> and whether it is Labor History, a Quote,
                            Music or a Film. It helps us find the right record quickly — there are
                            nearly 6,000 of them.
                        </p>
                    </div>

                    <div className="pt-2">
                        <div className="flex justify-center">
                            <a
                                href={mailtoHref}
                                className="inline-flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors"
                            >
                                <Mail size={16} />
                                Write to us
                            </a>
                        </div>
                        <p className="text-xs text-gray-500 mt-3 text-center">
                            Opens your email program with a short template. Prefer to write your own?
                            {' '}
                            <a
                                href={`mailto:${CONTACT_EMAIL}`}
                                className="text-red-400 hover:text-red-300 hover:underline"
                            >
                                {CONTACT_EMAIL}
                            </a>
                        </p>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <p className="text-xs text-gray-500">
                            We read everything that arrives, though we cannot always reply
                            individually. Corrections are checked against a source before anything
                            is changed.
                        </p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ContactModal;
