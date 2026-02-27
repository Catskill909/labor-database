import express from 'express';
import cors from 'cors';
import { PrismaClient, Prisma } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Image uploads directory — Coolify persistent storage mounts here in production
const uploadsDir = path.join(__dirname, '../uploads/entries');
fs.mkdirSync(uploadsDir, { recursive: true });

// Multer config for image uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
        }
    }
});

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Admin Authentication Middleware
const adminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const adminPassword = process.env.ADMIN_PASSWORD;

    // If no password configured, allow access (local dev convenience)
    if (!adminPassword) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader === `Bearer ${adminPassword}`) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized - Invalid or missing admin credentials' });
    }
};

// ==================== AUTH ====================

app.post('/api/admin/verify-password', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
        return res.json({ success: true, message: 'No admin password configured on server' });
    }

    if (password === adminPassword) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: 'Invalid password' });
    }
});

// ==================== CATEGORIES ====================

// GET all active categories (Public)
app.get('/api/categories', async (_req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
        });
        res.json(categories);
    } catch (error) {
        console.error('Fetch categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// GET all categories including inactive (Admin)
app.get('/api/admin/categories', adminAuth, async (_req, res) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { sortOrder: 'asc' }
        });
        res.json(categories);
    } catch (error) {
        console.error('Fetch admin categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// POST create category (Admin)
app.post('/api/admin/categories', adminAuth, async (req, res) => {
    const { slug, label, icon, sortOrder, isActive } = req.body;
    try {
        const category = await prisma.category.create({
            data: { slug, label, icon, sortOrder: sortOrder || 0, isActive: isActive !== false }
        });
        res.status(201).json(category);
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

// PUT update category (Admin)
app.put('/api/admin/categories/:id', adminAuth, async (req, res) => {
    const id = req.params.id as string;
    const { slug, label, icon, sortOrder, isActive } = req.body;
    try {
        const category = await prisma.category.update({
            where: { id: parseInt(id) },
            data: { slug, label, icon, sortOrder, isActive }
        });
        res.json(category);
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
});

// ==================== TMDB PROXY ====================

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

function tmdbHeaders(): HeadersInit {
    const key = process.env.TMDB_API_KEY;
    if (!key) throw new Error('TMDB_API_KEY not set');
    return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

// Search movies by title
app.get('/api/tmdb/search', async (req, res) => {
    const query = req.query.query as string;
    if (!query || !query.trim()) return res.json([]);

    try {
        const r = await fetch(`${TMDB_BASE}/search/movie?query=${encodeURIComponent(query.trim())}&page=1`, { headers: tmdbHeaders() });
        if (!r.ok) return res.status(r.status).json({ error: 'TMDB search failed' });
        const data = await r.json() as { results: Array<{ id: number; title: string; release_date?: string; overview: string; poster_path: string | null; genre_ids: number[] }> };

        const results = data.results.slice(0, 10).map(m => ({
            tmdbId: m.id,
            title: m.title,
            year: m.release_date ? parseInt(m.release_date.substring(0, 4)) : null,
            overview: m.overview,
            posterUrl: m.poster_path ? `${TMDB_IMG}/w185${m.poster_path}` : null,
        }));
        res.json(results);
    } catch (error) {
        console.error('TMDB search error:', error);
        res.status(500).json({ error: 'TMDB search failed' });
    }
});

// Get full movie details (credits + videos in one call)
app.get('/api/tmdb/movie/:tmdbId', async (req, res) => {
    const tmdbId = req.params.tmdbId as string;
    try {
        const r = await fetch(`${TMDB_BASE}/movie/${tmdbId}?append_to_response=credits,videos`, { headers: tmdbHeaders() });
        if (!r.ok) return res.status(r.status).json({ error: 'TMDB details failed' });
        const d = await r.json() as {
            id: number; title: string; release_date?: string; overview: string;
            runtime?: number; poster_path: string | null;
            genres: Array<{ name: string }>; production_countries: Array<{ iso_3166_1: string }>;
            credits: { cast: Array<{ name: string }>; crew: Array<{ name: string; job: string }> };
            videos: { results: Array<{ site: string; type: string; key: string }> };
        };

        const directors = d.credits.crew.filter(c => c.job === 'Director').map(c => c.name);
        const writers = d.credits.crew.filter(c => c.job === 'Writer' || c.job === 'Screenplay').map(c => c.name);
        const cast = d.credits.cast.slice(0, 10).map(c => c.name);
        const trailer = d.videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');

        res.json({
            tmdbId: d.id,
            title: d.title,
            year: d.release_date ? parseInt(d.release_date.substring(0, 4)) : null,
            overview: d.overview,
            runtime: d.runtime ? `${d.runtime}m` : null,
            country: d.production_countries.map(c => c.iso_3166_1).join(', '),
            genres: d.genres.map(g => g.name).join(', '),
            directors: directors.join(', '),
            writers: writers.join(', '),
            cast: cast.join(', '),
            youtubeTrailerId: trailer?.key || null,
            posterUrl: d.poster_path ? `${TMDB_IMG}/w500${d.poster_path}` : null,
            posterPath: d.poster_path,
        });
    } catch (error) {
        console.error('TMDB details error:', error);
        res.status(500).json({ error: 'TMDB details failed' });
    }
});

// Download TMDB poster and attach to entry
// No auth — called by both public submission and admin edit
// Safe: only downloads from TMDB CDN and attaches to an existing entry
app.post('/api/tmdb/download-poster', async (req, res) => {
    const { entryId, posterPath } = req.body;
    if (!entryId || !posterPath) return res.status(400).json({ error: 'entryId and posterPath required' });

    try {
        const imgUrl = `${TMDB_IMG}/w500${posterPath}`;
        const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(15000) });
        if (!imgRes.ok) return res.status(404).json({ error: 'Poster not found' });

        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const timestamp = Date.now();
        const filename = `${entryId}_${timestamp}_tmdb.jpg`;
        const thumbFilename = `thumb_${filename}`;

        await sharp(buffer).jpeg({ quality: 90 }).toFile(path.join(uploadsDir, filename));
        await sharp(buffer).resize(400, null, { withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(path.join(uploadsDir, thumbFilename));

        const image = await prisma.entryImage.create({
            data: { entryId: parseInt(entryId), filename, caption: null, sortOrder: 0 },
        });
        res.json(image);
    } catch (error) {
        console.error('TMDB poster download error:', error);
        res.status(500).json({ error: 'Failed to download poster' });
    }
});

// ==================== ON THIS DAY (Public) ====================

// GET entries for a specific month/day, grouped by category
app.get('/api/on-this-day', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const monthParam = req.query.month as string;
        const dayParam = req.query.day as string;

        if (!monthParam || !dayParam) {
            return res.status(400).json({ error: 'month and day query params required' });
        }

        const month = parseInt(monthParam);
        const day = parseInt(dayParam);

        if (month < 1 || month > 12 || day < 1 || day > 31) {
            return res.status(400).json({ error: 'Invalid month or day' });
        }

        // Get entries matching this month+day (history, quotes)
        const dateEntries = await prisma.entry.findMany({
            where: {
                isPublished: true,
                month,
                day,
            },
            orderBy: [{ year: 'asc' }],
            include: { images: { orderBy: { sortOrder: 'asc' } } },
        });

        // Build base URL for image paths
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const baseUrl = `${protocol}://${host}`;

        const addImageUrls = (e: typeof dateEntries[number]) => {
            const { submitterName: _sn, submitterEmail: _se, submitterComment: _sc, ...rest } = e;
            return {
                ...rest,
                images: rest.images.map(img => ({
                    ...img,
                    url: `${baseUrl}/uploads/entries/${img.filename}`,
                    thumbnailUrl: `${baseUrl}/uploads/entries/thumb_${img.filename}`,
                })),
            };
        };

        // Group by category
        const sections: Record<string, typeof dateEntries> = {};
        for (const entry of dateEntries) {
            if (!sections[entry.category]) sections[entry.category] = [];
            sections[entry.category].push(entry);
        }

        // Collect years from date-matched entries for year-based film/music matching
        const matchedYears = [...new Set(dateEntries.map(e => e.year).filter((y): y is number => y !== null))];

        // Get films and music from matching years (secondary content)
        let yearMatches: Record<string, typeof dateEntries> = {};
        if (matchedYears.length > 0) {
            const yearEntries = await prisma.entry.findMany({
                where: {
                    isPublished: true,
                    year: { in: matchedYears },
                    category: { in: ['film', 'music'] },
                },
                orderBy: [{ year: 'asc' }],
                include: { images: { orderBy: { sortOrder: 'asc' } } },
                take: 20,
            });

            for (const entry of yearEntries) {
                if (!yearMatches[entry.category]) yearMatches[entry.category] = [];
                yearMatches[entry.category].push(entry);
            }
        }

        // Build response with image URLs
        const sectionResult: Record<string, ReturnType<typeof addImageUrls>[]> = {};
        for (const [cat, entries] of Object.entries(sections)) {
            sectionResult[cat] = entries.map(addImageUrls);
        }
        const yearMatchResult: Record<string, ReturnType<typeof addImageUrls>[]> = {};
        for (const [cat, entries] of Object.entries(yearMatches)) {
            yearMatchResult[cat] = entries.map(addImageUrls);
        }

        // Build counts
        const counts: Record<string, number> = {};
        for (const [cat, entries] of Object.entries(sections)) {
            counts[cat] = entries.length;
        }
        for (const [cat, entries] of Object.entries(yearMatches)) {
            counts[cat] = (counts[cat] || 0) + entries.length;
        }

        res.json({
            date: { month, day },
            sections: sectionResult,
            yearMatches: yearMatchResult,
            matchedYears,
            counts,
        });
    } catch (error) {
        console.error('On This Day error:', error);
        res.status(500).json({ error: 'Failed to fetch On This Day data' });
    }
});

// GET which days in a month have entries (for calendar highlighting)
app.get('/api/on-this-day/calendar', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const monthParam = req.query.month as string;
        if (!monthParam) {
            return res.status(400).json({ error: 'month query param required' });
        }

        const month = parseInt(monthParam);
        if (month < 1 || month > 12) {
            return res.status(400).json({ error: 'Invalid month' });
        }

        const results: { day: number; count: number }[] = await prisma.$queryRaw`
            SELECT day, COUNT(*) as count
            FROM Entry
            WHERE isPublished = 1 AND month = ${month} AND day IS NOT NULL
            GROUP BY day
            ORDER BY day ASC
        `;

        const daysWithEntries = results.map(r => r.day);
        const entryCounts: Record<number, number> = {};
        for (const r of results) {
            entryCounts[r.day] = Number(r.count);
        }

        res.json({ month, daysWithEntries, entryCounts });
    } catch (error) {
        console.error('Calendar data error:', error);
        res.status(500).json({ error: 'Failed to fetch calendar data' });
    }
});

// ==================== ENTRIES (Public) ====================

// GET all published entries, optionally filtered by category
app.get('/api/entries', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const { category, search, month, day, year, creator, genre, limit, offset } = req.query;

        const where: Prisma.EntryWhereInput = { isPublished: true };

        if (category && typeof category === 'string') {
            where.category = category;
        }

        if (month && typeof month === 'string') {
            where.month = parseInt(month);
        }
        if (day && typeof day === 'string') {
            where.day = parseInt(day);
        }
        if (year && typeof year === 'string') {
            where.year = parseInt(year);
        }

        // Creator filter (case-insensitive via raw SQL)
        // Combined with other raw SQL filters below
        let filterIds: number[] | null = null;

        if (creator && typeof creator === 'string') {
            const q = `%${creator.trim()}%`;
            const results: { id: number }[] = await prisma.$queryRaw`
                SELECT id FROM Entry
                WHERE creator LIKE ${q}
            `;
            filterIds = results.map(r => r.id);
        }

        // Genre filter (searches within metadata JSON, case-insensitive)
        if (genre && typeof genre === 'string') {
            const q = `%${genre.trim()}%`;
            const results: { id: number }[] = await prisma.$queryRaw`
                SELECT id FROM Entry
                WHERE metadata LIKE ${q}
            `;
            const genreIds = results.map(r => r.id);
            // Intersect with existing filterIds if set
            if (filterIds !== null) {
                filterIds = filterIds.filter(id => genreIds.includes(id));
            } else {
                filterIds = genreIds;
            }
        }

        if (filterIds !== null) {
            where.id = { in: filterIds };
        }

        // For search: use raw SQL with LIKE (case-insensitive in SQLite)
        // then apply other filters via Prisma
        let searchIds: number[] | null = null;
        if (search && typeof search === 'string') {
            const q = `%${search.trim()}%`;
            const results: { id: number }[] = await prisma.$queryRaw`
                SELECT id FROM Entry
                WHERE title LIKE ${q}
                   OR description LIKE ${q}
                   OR creator LIKE ${q}
                   OR tags LIKE ${q}
                   OR metadata LIKE ${q}
            `;
            searchIds = results.map(r => r.id);
        }

        if (searchIds !== null) {
            // If we already have filterIds, intersect with search results
            if (where.id) {
                const existing = (where.id as { in: number[] }).in;
                where.id = { in: existing.filter(id => searchIds!.includes(id)) };
            } else {
                where.id = { in: searchIds };
            }
        }

        const entries = await prisma.entry.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { images: { orderBy: { sortOrder: 'asc' } } },
            take: limit ? parseInt(limit as string) : undefined,
            skip: offset ? parseInt(offset as string) : undefined,
        });

        // Build base URL for image paths
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const baseUrl = `${protocol}://${host}`;

        // Strip submitter contact info and add full image URLs
        const publicEntries = entries.map((e) => {
            const { submitterName: _sn, submitterEmail: _se, submitterComment: _sc, ...rest } = e;
            return {
                ...rest,
                images: rest.images.map((img) => ({
                    ...img,
                    url: `${baseUrl}/uploads/entries/${img.filename}`,
                    thumbnailUrl: `${baseUrl}/uploads/entries/thumb_${img.filename}`
                }))
            };
        });
        res.json(publicEntries);
    } catch (error) {
        console.error('Fetch entries error:', error);
        res.status(500).json({ error: 'Failed to fetch entries' });
    }
});

// GET distinct filter options for a category (Public)
app.get('/api/entries/filter-options', async (req, res) => {
    try {
        const { category } = req.query;
        if (!category || typeof category !== 'string') {
            return res.json({});
        }

        const options: Record<string, string[]> = {};

        if (category === 'music') {
            // Get distinct genres from metadata JSON
            const entries = await prisma.entry.findMany({
                where: { category: 'music', isPublished: true, metadata: { not: null } },
                select: { metadata: true }
            });
            const genres = new Set<string>();
            for (const e of entries) {
                try {
                    const meta = JSON.parse(e.metadata!);
                    if (meta.genre) {
                        // Some entries have comma-separated genres
                        meta.genre.split(',').forEach((g: string) => {
                            const trimmed = g.trim();
                            if (trimmed) genres.add(trimmed);
                        });
                    }
                } catch { /* skip bad JSON */ }
            }
            options.genres = [...genres].sort();
        }

        if (category === 'film') {
            // Get distinct genres from metadata JSON
            const filmEntries = await prisma.entry.findMany({
                where: { category: 'film', isPublished: true, metadata: { not: null } },
                select: { metadata: true }
            });
            const filmGenres = new Set<string>();
            for (const e of filmEntries) {
                try {
                    const meta = JSON.parse(e.metadata!);
                    if (meta.genre) {
                        meta.genre.split(',').forEach((g: string) => {
                            const trimmed = g.trim();
                            if (trimmed) filmGenres.add(trimmed);
                        });
                    }
                } catch { /* skip bad JSON */ }
            }
            options.genres = [...filmGenres].sort();

            // Get distinct years
            const filmYears: { year: number }[] = await prisma.$queryRaw`
                SELECT DISTINCT year FROM Entry
                WHERE category = 'film' AND isPublished = 1 AND year IS NOT NULL
                ORDER BY year DESC
            `;
            options.years = filmYears.map(y => String(y.year));
        }

        if (category === 'history') {
            // Get distinct years that have history entries
            const years: { year: number }[] = await prisma.$queryRaw`
                SELECT DISTINCT year FROM Entry
                WHERE category = 'history' AND isPublished = 1 AND year IS NOT NULL
                ORDER BY year DESC
            `;
            options.years = years.map(y => String(y.year));
        }

        res.json(options);
    } catch (error) {
        console.error('Filter options error:', error);
        res.status(500).json({ error: 'Failed to fetch filter options' });
    }
});

// GET entry count by category (Public)
app.get('/api/entries/counts', async (_req, res) => {
    try {
        const counts = await prisma.entry.groupBy({
            by: ['category'],
            where: { isPublished: true },
            _count: { id: true }
        });
        const result: Record<string, number> = {};
        for (const c of counts) {
            result[c.category] = c._count.id;
        }
        res.json(result);
    } catch (error) {
        console.error('Fetch counts error:', error);
        res.status(500).json({ error: 'Failed to fetch counts' });
    }
});

// GET single entry (Public - published only)
app.get('/api/entries/:id', async (req, res) => {
    const id = req.params.id as string;
    try {
        const entry = await prisma.entry.findFirst({
            where: { id: parseInt(id), isPublished: true },
            include: { images: { orderBy: { sortOrder: 'asc' } } }
        });
        if (entry) {
            const { submitterName: _sn, submitterEmail: _se, submitterComment: _sc, ...rest } = entry;
            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            const host = req.headers['x-forwarded-host'] || req.get('host');
            const baseUrl = `${protocol}://${host}`;
            res.json({
                ...rest,
                images: rest.images.map(img => ({
                    ...img,
                    url: `${baseUrl}/uploads/entries/${img.filename}`,
                    thumbnailUrl: `${baseUrl}/uploads/entries/thumb_${img.filename}`
                }))
            });
        } else {
            res.status(404).json({ error: 'Entry not found' });
        }
    } catch (error) {
        console.error('Fetch entry error:', error);
        res.status(500).json({ error: 'Failed to fetch entry' });
    }
});

// POST public submission (unpublished by default)
app.post('/api/entries', async (req, res) => {
    const { category, title, description, month, day, year, creator, metadata, tags, sourceUrl, submitterName, submitterEmail, submitterComment } = req.body;
    try {
        const entry = await prisma.entry.create({
            data: {
                category,
                title,
                description,
                month: month ? parseInt(month) : null,
                day: day ? parseInt(day) : null,
                year: year ? parseInt(year) : null,
                creator: creator || null,
                metadata: metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null,
                tags: tags || null,
                sourceUrl: sourceUrl || null,
                isPublished: false,
                submitterName: submitterName || null,
                submitterEmail: submitterEmail || null,
                submitterComment: submitterComment || null,
            }
        });
        res.status(201).json(entry);
    } catch (error) {
        console.error('Create entry error:', error);
        res.status(500).json({ error: 'Failed to create entry' });
    }
});

// ==================== ENTRIES (Admin) ====================

// GET all entries including unpublished (Admin)
app.get('/api/admin/entries', adminAuth, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const { category, search, isPublished, limit, offset } = req.query;

        const where: Prisma.EntryWhereInput = {};

        if (category && typeof category === 'string') {
            where.category = category;
        }
        if (isPublished !== undefined && typeof isPublished === 'string') {
            where.isPublished = isPublished === 'true';
        }
        if (search && typeof search === 'string') {
            const q = `%${search.trim()}%`;
            const results: { id: number }[] = await prisma.$queryRaw`
                SELECT id FROM Entry
                WHERE title LIKE ${q}
                   OR description LIKE ${q}
                   OR creator LIKE ${q}
                   OR tags LIKE ${q}
            `;
            where.id = { in: results.map(r => r.id) };
        }

        const take = limit ? parseInt(limit as string) : undefined;
        const skip = offset ? parseInt(offset as string) : undefined;

        const [entries, total] = await Promise.all([
            prisma.entry.findMany({
                where,
                orderBy: [{ isPublished: 'asc' }, { createdAt: 'desc' }],
                include: { images: { orderBy: { sortOrder: 'asc' } } },
                ...(take !== undefined && { take }),
                ...(skip !== undefined && { skip }),
            }),
            prisma.entry.count({ where }),
        ]);
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const baseUrl = `${protocol}://${host}`;
        const withUrls = entries.map(e => ({
            ...e,
            images: e.images.map(img => ({
                ...img,
                url: `${baseUrl}/uploads/entries/${img.filename}`,
                thumbnailUrl: `${baseUrl}/uploads/entries/thumb_${img.filename}`
            }))
        }));
        res.set('X-Total-Count', String(total));
        res.json(withUrls);
    } catch (error) {
        console.error('Fetch admin entries error:', error);
        res.status(500).json({ error: 'Failed to fetch admin entries' });
    }
});

// POST admin create entry (published by default)
app.post('/api/admin/entries', adminAuth, async (req, res) => {
    const { category, title, description, month, day, year, creator, metadata, tags, sourceUrl, isPublished, submitterName, submitterEmail, submitterComment } = req.body;
    try {
        const entry = await prisma.entry.create({
            data: {
                category,
                title,
                description,
                month: month ? parseInt(month) : null,
                day: day ? parseInt(day) : null,
                year: year ? parseInt(year) : null,
                creator: creator || null,
                metadata: metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null,
                tags: tags || null,
                sourceUrl: sourceUrl || null,
                isPublished: isPublished !== false,
                submitterName: submitterName || null,
                submitterEmail: submitterEmail || null,
                submitterComment: submitterComment || null,
            }
        });
        res.status(201).json(entry);
    } catch (error) {
        console.error('Admin create entry error:', error);
        res.status(500).json({ error: 'Failed to create entry' });
    }
});

// PUT update entry (Admin)
app.put('/api/admin/entries/:id', adminAuth, async (req, res) => {
    const id = req.params.id as string;
    const { category, title, description, month, day, year, creator, metadata, tags, sourceUrl, isPublished } = req.body;
    try {
        const entry = await prisma.entry.update({
            where: { id: parseInt(id) },
            data: {
                category,
                title,
                description,
                month: month !== undefined ? (month ? parseInt(month) : null) : undefined,
                day: day !== undefined ? (day ? parseInt(day) : null) : undefined,
                year: year !== undefined ? (year ? parseInt(year) : null) : undefined,
                creator: creator !== undefined ? (creator || null) : undefined,
                metadata: metadata !== undefined ? (metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null) : undefined,
                tags: tags !== undefined ? (tags || null) : undefined,
                sourceUrl: sourceUrl !== undefined ? (sourceUrl || null) : undefined,
                isPublished,
            }
        });
        res.json(entry);
    } catch (error) {
        console.error('Update entry error:', error);
        res.status(500).json({ error: 'Failed to update entry' });
    }
});

// DELETE entry (Admin)
app.delete('/api/admin/entries/:id', adminAuth, async (req, res) => {
    const id = req.params.id as string;
    try {
        // Delete associated image files
        const images = await prisma.entryImage.findMany({ where: { entryId: parseInt(id) } });
        for (const img of images) {
            try { fs.unlinkSync(path.join(uploadsDir, img.filename)); } catch { /* file may not exist */ }
            try { fs.unlinkSync(path.join(uploadsDir, `thumb_${img.filename}`)); } catch { /* file may not exist */ }
        }

        await prisma.entry.delete({ where: { id: parseInt(id) } });
        res.status(204).send();
    } catch (error) {
        console.error('Delete entry error:', error);
        res.status(500).json({ error: 'Failed to delete entry' });
    }
});

// PATCH toggle publish status (Admin — for review queue)
app.patch('/api/admin/entries/:id/publish', adminAuth, async (req, res) => {
    const id = req.params.id as string;
    const { isPublished } = req.body;
    try {
        const entry = await prisma.entry.update({
            where: { id: parseInt(id) },
            data: { isPublished }
        });
        res.json(entry);
    } catch (error) {
        console.error('Publish toggle error:', error);
        res.status(500).json({ error: 'Failed to update publish status' });
    }
});

// ==================== IMAGES ====================

// POST upload images for an entry
app.post('/api/entries/:id/images', upload.array('images', 10), async (req, res) => {
    const entryId = parseInt(req.params.id as string);
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    try {
        const entry = await prisma.entry.findUnique({ where: { id: entryId } });
        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        const maxSort = await prisma.entryImage.findFirst({
            where: { entryId },
            orderBy: { sortOrder: 'desc' }
        });
        let nextSort = (maxSort?.sortOrder ?? -1) + 1;

        const created = [];
        for (const file of files) {
            const timestamp = Date.now();
            const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filename = `${entryId}_${timestamp}_${safeName}`;
            const thumbFilename = `thumb_${filename}`;

            const originalPath = path.join(uploadsDir, filename);
            await sharp(file.buffer).toFile(originalPath);

            const thumbPath = path.join(uploadsDir, thumbFilename);
            await sharp(file.buffer)
                .resize(400, null, { withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toFile(thumbPath);

            const image = await prisma.entryImage.create({
                data: {
                    entryId,
                    filename,
                    sortOrder: nextSort++
                }
            });
            created.push(image);
        }

        res.status(201).json(created);
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ error: 'Failed to upload images' });
    }
});

// DELETE an image from an entry
app.delete('/api/entries/:id/images/:imageId', adminAuth, async (req, res) => {
    const entryId = parseInt(req.params.id as string);
    const imageId = parseInt(req.params.imageId as string);
    try {
        const image = await prisma.entryImage.findFirst({
            where: { id: imageId, entryId }
        });
        if (!image) {
            return res.status(404).json({ error: 'Image not found' });
        }

        try { fs.unlinkSync(path.join(uploadsDir, image.filename)); } catch { /* file may not exist */ }
        try { fs.unlinkSync(path.join(uploadsDir, `thumb_${image.filename}`)); } catch { /* file may not exist */ }

        await prisma.entryImage.delete({ where: { id: imageId } });
        res.status(204).send();
    } catch (error) {
        console.error('Image delete error:', error);
        res.status(500).json({ error: 'Failed to delete image' });
    }
});

// ==================== BACKUP / IMPORT ====================

// GET backup of all entries as JSON file
app.get('/api/admin/backup', adminAuth, async (_req, res) => {
    try {
        const entries = await prisma.entry.findMany({
            orderBy: { id: 'asc' },
            include: { images: { orderBy: { sortOrder: 'asc' } } }
        });
        const categories = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
        const date = new Date().toISOString().split('T')[0];
        const filename = `labor_database_backup_${date}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.send(JSON.stringify({ entries, categories }, null, 2));
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate backup' });
    }
});

// POST import entries (Smart Merge with Transaction)
app.post('/api/admin/import', adminAuth, async (req, res) => {
    const data = req.body;

    // Support both array format and {entries, categories} format
    const entries = Array.isArray(data) ? data : data.entries;
    const categories = Array.isArray(data) ? null : data.categories;

    if (!Array.isArray(entries)) {
        return res.status(400).json({ error: 'Invalid format. Expected JSON array or {entries, categories}.' });
    }

    try {
        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            let addedCount = 0;
            let updatedCount = 0;
            let skippedCount = 0;

            // Import categories if provided
            if (categories && Array.isArray(categories)) {
                for (const cat of categories) {
                    await tx.category.upsert({
                        where: { slug: cat.slug },
                        update: { label: cat.label, icon: cat.icon, sortOrder: cat.sortOrder, isActive: cat.isActive },
                        create: { slug: cat.slug, label: cat.label, icon: cat.icon, sortOrder: cat.sortOrder, isActive: cat.isActive }
                    });
                }
            }

            for (const item of entries) {
                // Check for existing entry by title + category (dedup strategy)
                const existing = await tx.entry.findFirst({
                    where: {
                        title: item.title,
                        category: item.category,
                    }
                });

                if (existing) {
                    // Update existing
                    await tx.entry.update({
                        where: { id: existing.id },
                        data: {
                            description: item.description,
                            month: item.month,
                            day: item.day,
                            year: item.year,
                            creator: item.creator,
                            metadata: item.metadata,
                            tags: item.tags,
                            sourceUrl: item.sourceUrl,
                            isPublished: item.isPublished,
                        }
                    });
                    updatedCount++;
                } else {
                    await tx.entry.create({
                        data: {
                            category: item.category,
                            title: item.title,
                            description: item.description,
                            month: item.month,
                            day: item.day,
                            year: item.year,
                            creator: item.creator,
                            metadata: item.metadata,
                            tags: item.tags,
                            sourceUrl: item.sourceUrl,
                            isPublished: item.isPublished !== false,
                            submitterName: item.submitterName,
                            submitterEmail: item.submitterEmail,
                            submitterComment: item.submitterComment,
                        }
                    });
                    addedCount++;
                }
            }

            return { added: addedCount, updated: updatedCount, skipped: skippedCount };
        });

        res.json({ message: 'Import completed', stats: result });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Failed to import data' });
    }
});

// DELETE all entries (Emergency/Reset)
app.delete('/api/admin/clear', adminAuth, async (_req, res) => {
    try {
        await prisma.entry.deleteMany();
        res.json({ message: 'All entries deleted' });
    } catch (error) {
        console.error('Clear entries error:', error);
        res.status(500).json({ error: 'Failed to clear entries' });
    }
});

// ==================== STATIC FILES ====================

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// The "catch-all" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(port, () => {
    console.log(`Labor Database server running at http://localhost:${port}`);
});
