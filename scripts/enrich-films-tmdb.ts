/**
 * TMDB Film Enrichment Script
 *
 * Enriches existing film entries with structured data from TMDB:
 * - Director, writers, cast, runtime, country, genre
 * - YouTube trailer ID
 * - Poster image (downloaded + thumbnailed via Sharp)
 * - Preserves original description as metadata.comment
 *
 * Idempotent: skips entries that already have metadata.tmdbId
 *
 * Usage: npx tsx scripts/enrich-films-tmdb.ts [--dry-run] [--limit N] [--no-posters]
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const prisma = new PrismaClient();
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';
const uploadsDir = path.join(__dirname, '../uploads/entries');

// CLI flags
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const NO_POSTERS = args.includes('--no-posters');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : undefined;

function tmdbHeaders(): HeadersInit {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error('TMDB_API_KEY not set in .env');
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

// Rate-limit helper: small delay between requests
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface TmdbSearchResult {
  id: number;
  title: string;
  release_date?: string;
  overview: string;
  poster_path: string | null;
}

interface TmdbMovieDetail {
  id: number;
  title: string;
  release_date?: string;
  overview: string;
  runtime?: number;
  poster_path: string | null;
  genres: Array<{ name: string }>;
  production_countries: Array<{ iso_3166_1: string }>;
  credits: {
    cast: Array<{ name: string }>;
    crew: Array<{ name: string; job: string }>;
  };
  videos: {
    results: Array<{ site: string; type: string; key: string }>;
  };
}

// Normalize title for comparison (lowercase, strip punctuation)
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// Fuzzy title match score (0-1)
function titleMatch(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;
  // Check if one contains the other
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  // Simple word overlap
  const wordsA = new Set(na.split(' '));
  const wordsB = new Set(nb.split(' '));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

async function searchTmdb(title: string, year?: number | null): Promise<TmdbSearchResult[]> {
  const params = new URLSearchParams({ query: title, page: '1' });
  if (year) params.set('year', String(year));

  const r = await fetch(`${TMDB_BASE}/search/movie?${params}`, { headers: tmdbHeaders() });
  if (!r.ok) {
    console.error(`  TMDB search failed (${r.status}): ${title}`);
    return [];
  }
  const data = await r.json() as { results: TmdbSearchResult[] };
  return data.results || [];
}

async function getMovieDetails(tmdbId: number): Promise<TmdbMovieDetail | null> {
  const r = await fetch(`${TMDB_BASE}/movie/${tmdbId}?append_to_response=credits,videos`, { headers: tmdbHeaders() });
  if (!r.ok) {
    console.error(`  TMDB details failed (${r.status}): tmdbId=${tmdbId}`);
    return null;
  }
  return await r.json() as TmdbMovieDetail;
}

async function downloadPoster(entryId: number, posterPath: string): Promise<boolean> {
  if (NO_POSTERS || DRY_RUN) return false;

  try {
    fs.mkdirSync(uploadsDir, { recursive: true });

    const imgUrl = `${TMDB_IMG}/w500${posterPath}`;
    const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(15000) });
    if (!imgRes.ok) return false;

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const timestamp = Date.now();
    const filename = `${entryId}_${timestamp}_tmdb.jpg`;
    const thumbFilename = `thumb_${filename}`;

    await sharp(buffer).jpeg({ quality: 90 }).toFile(path.join(uploadsDir, filename));
    await sharp(buffer).resize(400, null, { withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(path.join(uploadsDir, thumbFilename));

    await prisma.entryImage.create({
      data: { entryId, filename, caption: null, sortOrder: 0 },
    });

    return true;
  } catch (err) {
    console.error(`  Poster download failed for entry ${entryId}:`, err);
    return false;
  }
}

async function main() {
  console.log('=== TMDB Film Enrichment ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}${NO_POSTERS ? ' (no posters)' : ''}`);
  if (LIMIT) console.log(`Limit: ${LIMIT} entries`);
  console.log('');

  // Get all film entries
  const allFilms = await prisma.entry.findMany({
    where: { category: 'film' },
    include: { images: true },
    orderBy: { id: 'asc' },
  });

  console.log(`Total film entries: ${allFilms.length}`);

  // Filter out already-enriched entries (have tmdbId in metadata)
  const toEnrich = allFilms.filter(film => {
    if (!film.metadata) return true;
    try {
      const meta = JSON.parse(film.metadata);
      return !meta.tmdbId;
    } catch {
      return true;
    }
  });

  console.log(`Already enriched: ${allFilms.length - toEnrich.length}`);
  console.log(`To enrich: ${toEnrich.length}`);

  const films = LIMIT ? toEnrich.slice(0, LIMIT) : toEnrich;
  console.log(`Processing: ${films.length}\n`);

  let matched = 0;
  let fuzzyMatched = 0;
  let noMatch = 0;
  let errors = 0;
  let postersDownloaded = 0;
  const noMatchList: string[] = [];
  const fuzzyList: string[] = [];

  for (let i = 0; i < films.length; i++) {
    const film = films[i];
    const progress = `[${i + 1}/${films.length}]`;

    // Parse existing metadata
    let existingMeta: Record<string, string> = {};
    if (film.metadata) {
      try { existingMeta = JSON.parse(film.metadata); } catch { /* ignore */ }
    }

    // Clean title for search (remove things like year in parens already in title)
    let searchTitle = film.title.replace(/\s*\(\d{4}\)\s*$/, '').trim();
    // Also handle ALL CAPS titles — TMDB search handles them fine

    try {
      // Step 1: Search TMDB
      let results = await searchTmdb(searchTitle, film.year);

      // If no results and title has special chars, try simplified
      if (results.length === 0 && /[^a-zA-Z0-9\s]/.test(searchTitle)) {
        const simplified = searchTitle.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        if (simplified !== searchTitle) {
          results = await searchTmdb(simplified, film.year);
        }
      }

      // If still no results and we used year filter, try without year
      if (results.length === 0 && film.year) {
        results = await searchTmdb(searchTitle);
      }

      if (results.length === 0) {
        console.log(`${progress} NO MATCH: "${film.title}"`);
        noMatch++;
        noMatchList.push(film.title);
        await delay(30); // Small delay even on miss
        continue;
      }

      // Step 2: Find best match
      let bestResult: TmdbSearchResult | null = null;
      let bestScore = 0;

      for (const result of results.slice(0, 5)) {
        let score = titleMatch(searchTitle, result.title);

        // Year match bonus
        if (film.year && result.release_date) {
          const tmdbYear = parseInt(result.release_date.substring(0, 4));
          if (tmdbYear === film.year) score += 0.3;
          else if (Math.abs(tmdbYear - film.year) <= 1) score += 0.1;
        }

        if (score > bestScore) {
          bestScore = score;
          bestResult = result;
        }
      }

      if (!bestResult || bestScore < 0.5) {
        console.log(`${progress} NO MATCH (low score ${bestScore.toFixed(2)}): "${film.title}"`);
        noMatch++;
        noMatchList.push(film.title);
        await delay(30);
        continue;
      }

      const isExact = bestScore >= 0.9;

      // Step 3: Get full details
      const details = await getMovieDetails(bestResult.id);
      if (!details) {
        errors++;
        await delay(50);
        continue;
      }

      const directors = details.credits.crew.filter(c => c.job === 'Director').map(c => c.name);
      const writers = details.credits.crew.filter(c => c.job === 'Writer' || c.job === 'Screenplay').map(c => c.name);
      const cast = details.credits.cast.slice(0, 10).map(c => c.name);
      const trailer = details.videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
      const genres = details.genres.map(g => g.name).join(', ');
      const countries = details.production_countries.map(c => c.iso_3166_1).join(', ');
      const runtime = details.runtime ? `${details.runtime}m` : null;
      const tmdbYear = details.release_date ? parseInt(details.release_date.substring(0, 4)) : null;

      // Build enriched metadata — preserve existing, add TMDB data
      const newMeta: Record<string, string> = {};

      // TMDB tracking
      newMeta.tmdbId = String(details.id);

      // Structured fields
      if (cast.length > 0) newMeta.cast = cast.join(', ');
      if (writers.length > 0) newMeta.writers = writers.join(', ');
      if (runtime) newMeta.duration = runtime;
      if (countries) newMeta.country = countries;
      if (genres) newMeta.genre = genres;
      if (trailer) newMeta.youtubeId = trailer.key;
      if (details.poster_path) newMeta.posterUrl = `${TMDB_IMG}/w500${details.poster_path}`;

      // Preserve original description as comment
      if (film.description && film.description.trim()) {
        newMeta.comment = film.description;
      }

      // Preserve existing descriptionHtml if present
      if (existingMeta.descriptionHtml) {
        newMeta.descriptionHtml = existingMeta.descriptionHtml;
      }

      // Preserve existing tags from metadata
      if (existingMeta.tmdbPosterPath) {
        newMeta.tmdbPosterPath = existingMeta.tmdbPosterPath;
      }

      const metadataStr = JSON.stringify(newMeta);

      if (!DRY_RUN) {
        // Update entry
        await prisma.entry.update({
          where: { id: film.id },
          data: {
            creator: directors.join(', ') || film.creator, // Keep existing if TMDB has none
            year: tmdbYear || film.year,
            description: details.overview || film.description, // TMDB synopsis
            metadata: metadataStr,
          },
        });

        // Download poster if entry doesn't already have images
        if (details.poster_path && film.images.length === 0) {
          const downloaded = await downloadPoster(film.id, details.poster_path);
          if (downloaded) postersDownloaded++;
        }
      }

      if (isExact) {
        console.log(`${progress} MATCHED: "${film.title}" → "${details.title}" (${tmdbYear}) [${bestScore.toFixed(2)}]`);
        matched++;
      } else {
        console.log(`${progress} FUZZY:   "${film.title}" → "${details.title}" (${tmdbYear}) [${bestScore.toFixed(2)}]`);
        fuzzyMatched++;
        fuzzyList.push(`"${film.title}" → "${details.title}" (${tmdbYear})`);
      }

      // Rate limiting: ~25ms between entries (2 API calls per entry)
      await delay(50);

    } catch (err) {
      console.error(`${progress} ERROR: "${film.title}":`, err);
      errors++;
      await delay(100);
    }
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Processed:        ${films.length}`);
  console.log(`Exact matches:    ${matched}`);
  console.log(`Fuzzy matches:    ${fuzzyMatched}`);
  console.log(`No match:         ${noMatch}`);
  console.log(`Errors:           ${errors}`);
  console.log(`Posters downloaded: ${postersDownloaded}`);

  if (fuzzyList.length > 0 && fuzzyList.length <= 50) {
    console.log('\n--- Fuzzy matches (review these) ---');
    for (const f of fuzzyList) console.log(`  ${f}`);
  }

  if (noMatchList.length > 0 && noMatchList.length <= 50) {
    console.log('\n--- No match (may not be real films) ---');
    for (const n of noMatchList) console.log(`  ${n}`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  prisma.$disconnect();
  process.exit(1);
});
