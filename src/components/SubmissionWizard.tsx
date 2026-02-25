import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import type { Category } from '../types.ts';

interface SubmissionWizardProps {
  categories: Category[];
  onClose: () => void;
  onSubmitted: () => void;
}

export default function SubmissionWizard({ categories, onClose, onSubmitted }: SubmissionWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Common fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [creator, setCreator] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  // Music-specific
  const [songwriter, setSongwriter] = useState('');
  const [performer, setPerformer] = useState('');
  const [genre, setGenre] = useState('');
  const [runTime, setRunTime] = useState('');
  const [lyrics, setLyrics] = useState('');

  // Quote-specific
  const [quoteDetail, setQuoteDetail] = useState('');

  // Contact
  const [submitterName, setSubmitterName] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [submitterComment, setSubmitterComment] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      let metadata: Record<string, string> = {};
      let entryTitle = title;
      let entryCreator = creator;

      if (selectedCategory === 'music') {
        metadata = { writer: songwriter, performer, genre, runTime, locationUrl: sourceUrl, lyrics };
        if (!entryCreator && performer) entryCreator = performer;
      } else if (selectedCategory === 'quote') {
        metadata = { source: quoteDetail };
        if (!entryTitle && description) {
          entryTitle = description.substring(0, 80) + (description.length > 80 ? '...' : '');
        }
        if (!entryCreator && creator) entryCreator = creator;
      } else if (selectedCategory === 'history') {
        if (!entryTitle && description) {
          entryTitle = description.substring(0, 80) + (description.length > 80 ? '...' : '');
        }
      }

      const body = {
        category: selectedCategory,
        title: entryTitle,
        description,
        month: month || null,
        day: day || null,
        year: year || null,
        creator: entryCreator || null,
        metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
        sourceUrl: sourceUrl || null,
        submitterName: submitterName || null,
        submitterEmail: submitterEmail || null,
        submitterComment: submitterComment || null,
      };

      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Submission failed');
      setSubmitted(true);
      setTimeout(() => onSubmitted(), 2000);
    } catch (err) {
      console.error('Submission error:', err);
      alert('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-400" />
          </div>
          <h3 className="text-lg font-bold mb-2">Thank You!</h3>
          <p className="text-sm text-gray-400">Your submission has been received and will be reviewed by an admin before publishing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold">
            {step === 1 ? 'What are you adding?' : step === 2 ? `Add ${categories.find(c => c.slug === selectedCategory)?.label || ''}` : 'Your Contact Info'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Step 1: Pick category */}
          {step === 1 && (
            <div className="space-y-2">
              {categories.map(cat => (
                <button
                  key={cat.slug}
                  onClick={() => { setSelectedCategory(cat.slug); setStep(2); }}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selectedCategory === cat.slug
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-[var(--border)] hover:border-white/20'
                  }`}
                >
                  <span className="font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Category-specific form */}
          {step === 2 && selectedCategory === 'history' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <input type="number" placeholder="Month" value={month} onChange={e => setMonth(e.target.value)} className="input-field" min="1" max="12" />
                <input type="number" placeholder="Day" value={day} onChange={e => setDay(e.target.value)} className="input-field" min="1" max="31" />
                <input type="number" placeholder="Year" value={year} onChange={e => setYear(e.target.value)} className="input-field" />
              </div>
              <textarea
                placeholder="Please write about the moment in labor history"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={5}
                className="input-field"
              />
            </div>
          )}

          {step === 2 && selectedCategory === 'quote' && (
            <div className="space-y-3">
              <input type="text" placeholder="Author" value={creator} onChange={e => setCreator(e.target.value)} className="input-field" />
              <input type="text" placeholder="Description/detail" value={quoteDetail} onChange={e => setQuoteDetail(e.target.value)} className="input-field" />
              <input type="text" placeholder="Date(s)" value={year} onChange={e => setYear(e.target.value)} className="input-field" />
              <textarea
                placeholder="Quote"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                className="input-field"
              />
            </div>
          )}

          {step === 2 && selectedCategory === 'music' && (
            <div className="space-y-3">
              <input type="text" placeholder="Song Title" value={title} onChange={e => setTitle(e.target.value)} className="input-field" />
              <input type="text" placeholder="Song Writer" value={songwriter} onChange={e => setSongwriter(e.target.value)} className="input-field" />
              <input type="text" placeholder="Song Performer" value={performer} onChange={e => setPerformer(e.target.value)} className="input-field" />
              <input type="text" placeholder="Location URL (YouTube link, etc)" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className="input-field" />
              <div className="grid grid-cols-3 gap-2">
                <input type="text" placeholder="Genre" value={genre} onChange={e => setGenre(e.target.value)} className="input-field" />
                <input type="text" placeholder="Run Time" value={runTime} onChange={e => setRunTime(e.target.value)} className="input-field" />
                <input type="text" placeholder="Date Written" value={year} onChange={e => setYear(e.target.value)} className="input-field" />
              </div>
              <textarea
                placeholder="Please add keywords or lyrics snippet"
                value={lyrics}
                onChange={e => setLyrics(e.target.value)}
                rows={4}
                className="input-field"
              />
            </div>
          )}

          {step === 2 && selectedCategory === 'film' && (
            <div className="space-y-3">
              <input type="text" placeholder="Film Title" value={title} onChange={e => setTitle(e.target.value)} className="input-field" />
              <input type="text" placeholder="Director(s)" value={creator} onChange={e => setCreator(e.target.value)} className="input-field" />
              <input type="number" placeholder="Year" value={year} onChange={e => setYear(e.target.value)} className="input-field" />
              <textarea
                placeholder="Synopsis"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                className="input-field"
              />
              <input type="text" placeholder="Trailer URL" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className="input-field" />
            </div>
          )}

          {/* Step 3: Contact info */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Your name and email address in case we need more info</p>
              <input type="text" placeholder="Your Name" value={submitterName} onChange={e => setSubmitterName(e.target.value)} className="input-field" />
              <input type="email" placeholder="Email Address" value={submitterEmail} onChange={e => setSubmitterEmail(e.target.value)} className="input-field" />
              <textarea
                placeholder="Comments (optional)"
                value={submitterComment}
                onChange={e => setSubmitterComment(e.target.value)}
                rows={2}
                className="input-field"
              />
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between p-6 pt-4 border-t border-[var(--border)]">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="flex items-center gap-1 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={16} />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Next
              <ChevronRight size={16} />
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .input-field {
          width: 100%;
          padding: 0.625rem 0.75rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.5rem;
          font-size: 0.875rem;
          color: var(--foreground);
          outline: none;
          transition: border-color 0.2s;
        }
        .input-field:focus {
          border-color: rgba(59,130,246,0.5);
        }
        .input-field::placeholder {
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}
