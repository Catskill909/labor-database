import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import type { Category } from '../types.ts';
import ImageDropzone from './ImageDropzone.tsx';
import TmdbSearch from './TmdbSearch.tsx';
import type { TmdbMovieDetails } from './TmdbSearch.tsx';

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

  // Film-specific
  const [filmCast, setFilmCast] = useState('');
  const [filmWriters, setFilmWriters] = useState('');
  const [filmRuntime, setFilmRuntime] = useState('');
  const [filmCountry, setFilmCountry] = useState('');
  const [filmGenre, setFilmGenre] = useState('');
  const [filmTags, setFilmTags] = useState('');
  const [tmdbPosterPath, setTmdbPosterPath] = useState<string | null>(null);
  const [tmdbPosterPreview, setTmdbPosterPreview] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  // Quote-specific
  const [quoteDetail, setQuoteDetail] = useState('');

  // Contact
  const [submitterName, setSubmitterName] = useState('');
  const [submitterEmail, setSubmitterEmail] = useState('');
  const [submitterComment, setSubmitterComment] = useState('');

  const handleTmdbSelect = (movie: TmdbMovieDetails) => {
    setTitle(movie.title);
    setCreator(movie.directors);
    setFilmCast(movie.cast);
    setFilmWriters(movie.writers);
    setFilmRuntime(movie.runtime || '');
    setFilmCountry(movie.country);
    setFilmGenre(movie.genres);
    setDescription(movie.overview);
    if (movie.year) setYear(String(movie.year));
    if (movie.youtubeTrailerId) {
      setSourceUrl(`https://www.youtube.com/watch?v=${movie.youtubeTrailerId}`);
    }
    if (movie.posterPath) {
      setTmdbPosterPath(movie.posterPath);
      setTmdbPosterPreview(movie.posterUrl);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      let metadata: Record<string, string> = {};
      let entryTitle = title;
      let entryCreator = creator;
      let entryTags = '';

      if (selectedCategory === 'film') {
        metadata = {};
        if (filmCast) metadata.cast = filmCast;
        if (filmWriters) metadata.writers = filmWriters;
        if (filmRuntime) metadata.duration = filmRuntime;
        if (filmCountry) metadata.country = filmCountry;
        if (filmGenre) metadata.genre = filmGenre;
        if (tmdbPosterPath) metadata.tmdbPosterPath = tmdbPosterPath;
        // Extract YouTube ID from trailer URL
        if (sourceUrl) {
          const ytMatch = sourceUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          if (ytMatch) metadata.youtubeId = ytMatch[1];
        }
        entryTags = filmTags;
      } else if (selectedCategory === 'music') {
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
        tags: entryTags || null,
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
      const entryData = await res.json();

      // Upload dragged images if any
      if (imageFiles.length > 0) {
        const formData = new FormData();
        for (const file of imageFiles) {
          formData.append('images', file);
        }
        await fetch(`/api/entries/${entryData.id}/images`, {
          method: 'POST',
          body: formData,
        });
      } else if (tmdbPosterPath && selectedCategory === 'film') {
        // Download TMDB poster server-side (no user-uploaded images)
        await fetch('/api/tmdb/download-poster', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entryId: entryData.id, posterPath: tmdbPosterPath }),
        }).catch(() => {}); // Non-critical — entry still created
      }

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
                      ? 'border-red-500 bg-red-500/10'
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
              <TmdbSearch onSelect={handleTmdbSelect} />

              {tmdbPosterPreview && !imageFiles.length && (
                <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                  <img src={tmdbPosterPreview} alt="Poster" className="w-12 h-18 object-cover rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-green-400">TMDB poster will be downloaded automatically</p>
                    <button type="button" onClick={() => { setTmdbPosterPath(null); setTmdbPosterPreview(null); }} className="text-xs text-gray-500 hover:text-white">Remove</button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-gray-400 block mb-1">Film Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Director(s)</label>
                <input type="text" value={creator} onChange={e => setCreator(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Writer(s)</label>
                <input type="text" value={filmWriters} onChange={e => setFilmWriters(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Cast / Starring</label>
                <input type="text" value={filmCast} onChange={e => setFilmCast(e.target.value)} className="input-field" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Runtime</label>
                  <input type="text" placeholder="e.g. 95m" value={filmRuntime} onChange={e => setFilmRuntime(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Country</label>
                  <input type="text" value={filmCountry} onChange={e => setFilmCountry(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Year</label>
                  <input type="number" value={year} onChange={e => setYear(e.target.value)} className="input-field" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Genre</label>
                <input type="text" placeholder="e.g. Documentary, Drama" value={filmGenre} onChange={e => setFilmGenre(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Synopsis</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Trailer URL (YouTube, Vimeo)</label>
                <input type="text" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Tags</label>
                <input type="text" placeholder="e.g. Women, Strikes, Working Class" value={filmTags} onChange={e => setFilmTags(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Comments / Notes (optional)</label>
                <textarea
                  placeholder="Additional context, why this film matters, etc."
                  value={submitterComment}
                  onChange={e => setSubmitterComment(e.target.value)}
                  rows={3}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Poster Image (or use TMDB poster above)</label>
                <ImageDropzone files={imageFiles} setFiles={setImageFiles} maxFiles={3} />
              </div>
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
              className="flex items-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Next
              <ChevronRight size={16} />
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
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
