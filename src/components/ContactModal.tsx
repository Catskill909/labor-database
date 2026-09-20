import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, AlertCircle, Plus, Link2, HelpCircle } from 'lucide-react';
import type { Entry } from '../types.ts';
import { formatFullEntryDate } from '../types.ts';

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    /**
     * The entry being reported, when the modal was opened from a card rather
     * than from the site menu. Prefills the template's first question.
     */
    entry?: Entry | null;
}

const CONTACT_EMAIL = 'info@laborheritage.org';

const CATEGORY_LABELS: Record<string, string> = {
    history: 'Labor History',
    quote: 'Labor Quote',
    music: 'Music',
    film: 'Film',
};

function categoryLabel(entry: Entry): string {
    return CATEGORY_LABELS[entry.category] ?? 'Entry';
}

/**
 * How a card identifies its entry in the email.
 *
 * Entries have no individual URLs yet, so a reporter cannot paste a link. The
 * id is what actually finds the record among nearly 6,000; the title and date
 * are there so the sender can see they picked the right one.
 */
function entryReferenceLines(entry: Entry): string[] {
    const date = formatFullEntryDate(entry);
    const lines = [[categoryLabel(entry), date].filter(Boolean).join(' — ')];
    if (entry.title) lines.push(`"${entry.title}"`);
    lines.push(`(Reference: entry #${entry.id} — please leave this line in, it is how we find the record.)`);
    return lines;
}

/**
 * The body template is the point of this modal.
 *
 * Opened from the menu there is no entry, so it has to ask which record the
 * message is about — without that prompt, reports arrive as "the miners film is
 * wrong", which costs whoever reads it a search. Opened from a card we already
 * know, so the question is answered rather than asked.
 */
function buildMailBody(entry?: Entry | null): string {
    const whichEntry = entry
        ? entryReferenceLines(entry)
        : [
            '(Please give the title, and whether it is Labor History, a Quote, Music or a Film.',
            'Skip this if your message is not about a particular entry.)',
            '',
        ];

    return [
        'WHICH ENTRY IS THIS ABOUT?',
        ...whichEntry,
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
}

function buildMailSubject(entry?: Entry | null): string {
    if (!entry) return 'Labor Database — correction or comment';
    const date = formatFullEntryDate(entry);
    const name = entry.title?.trim() || date || `entry #${entry.id}`;
    const short = name.length > 60 ? name.slice(0, 57).trimEnd() + '…' : name;
    return `Labor Database — correction: ${short}`;
}

function buildMailtoHref(entry?: Entry | null): string {
    return (
        `mailto:${CONTACT_EMAIL}` +
        `?subject=${encodeURIComponent(buildMailSubject(entry))}` +
        `&body=${encodeURIComponent(buildMailBody(entry))}`
    );
}

const WELCOME: { icon: React.ReactNode; text: string }[] = [
    { icon: <AlertCircle size={14} />, text: 'A correction to something we have wrong — a date, a name, a detail' },
    { icon: <Plus size={14} />, text: 'A film, song, quote or event we are missing' },
    { icon: <Link2 size={14} />, text: 'A link or video that no longer works' },
    { icon: <HelpCircle size={14} />, text: 'A question about the collection, or how to use it' },
];

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, entry }) => {
    if (!isOpen) return null;

    const mailtoHref = buildMailtoHref(entry);

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

                    {entry ? (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-1.5">
                                About this entry
                            </p>
                            <p className="text-sm text-white font-semibold">
                                {[categoryLabel(entry), formatFullEntryDate(entry)].filter(Boolean).join(' — ')}
                            </p>
                            {entry.title && (
                                <p className="text-sm text-gray-300 mt-1 line-clamp-3">{entry.title}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                                We will fill this in for you, so you can go straight to what is wrong.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <p className="text-sm text-gray-300">
                                <span className="font-semibold text-white">If it is about a particular entry,
                                please tell us its title</span> and whether it is Labor History, a Quote,
                                Music or a Film. It helps us find the right record quickly — there are
                                nearly 6,000 of them.
                            </p>
                        </div>
                    )}

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

/**
 * The correction button shown in an entry's detail modal: a circular mail
 * button that opens this modal with the entry already identified.
 *
 * It owns its own open state, so the detail modal does not have to hold any.
 * It sits in normal flow — the caller positions it. Keep it that way:
 * `[data-tooltip] { position: relative }` in index.css is unlayered, and
 * unlayered rules beat Tailwind's `@layer utilities`, so any `absolute` put on
 * this element would be silently overridden.
 *
 * It carries `data-tooltip-pos="top-end"` because it sits on the popup's bottom
 * edge, where the default downward bubble would fall outside the panel.
 */
export function EntryCorrectionButton({ entry }: { entry: Entry }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label="Contact & Corrections"
                data-tooltip={"Contact & Corrections"}
                data-tooltip-pos="top-end"
                className={
                    'grid place-items-center w-10 h-10 shrink-0 rounded-full ' +
                    'bg-white/[0.06] border border-white/10 text-gray-400 shadow-sm ' +
                    'hover:bg-white/[0.12] hover:border-white/20 hover:text-gray-100 ' +
                    'hover:shadow-md active:scale-95 ' +
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ' +
                    'transition-all duration-200'
                }
            >
                <Mail size={16} />
            </button>
            <ContactModal isOpen={isOpen} onClose={() => setIsOpen(false)} entry={entry} />
        </>
    );
}

export default ContactModal;
