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
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
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

// ==================== ENTRIES (Public) ====================

// GET all published entries, optionally filtered by category
app.get('/api/entries', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const { category, search, month, day, year, limit, offset } = req.query;

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

        if (search && typeof search === 'string') {
            const q = search.trim();
            where.OR = [
                { title: { contains: q } },
                { description: { contains: q } },
                { creator: { contains: q } },
                { tags: { contains: q } },
                { metadata: { contains: q } }
            ];
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
            res.json(rest);
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
        const { category, search, isPublished } = req.query;

        const where: Prisma.EntryWhereInput = {};

        if (category && typeof category === 'string') {
            where.category = category;
        }
        if (isPublished !== undefined && typeof isPublished === 'string') {
            where.isPublished = isPublished === 'true';
        }
        if (search && typeof search === 'string') {
            const q = search.trim();
            where.OR = [
                { title: { contains: q } },
                { description: { contains: q } },
                { creator: { contains: q } },
                { tags: { contains: q } },
            ];
        }

        const entries = await prisma.entry.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { images: { orderBy: { sortOrder: 'asc' } } }
        });
        res.json(entries);
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
