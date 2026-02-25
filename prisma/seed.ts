import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
    { slug: 'history', label: 'Labor History', icon: 'scroll-text', sortOrder: 0 },
    { slug: 'quote', label: 'Labor Quotes', icon: 'quote', sortOrder: 1 },
    { slug: 'music', label: 'Labor Music', icon: 'music', sortOrder: 2 },
    { slug: 'film', label: 'Labor Films', icon: 'film', sortOrder: 3 },
];

async function main() {
    // Seed default categories if none exist
    const categoryCount = await prisma.category.count();
    if (categoryCount === 0) {
        console.log('Seeding default categories...');
        for (const cat of DEFAULT_CATEGORIES) {
            await prisma.category.create({ data: cat });
        }
        console.log(`Seeded ${DEFAULT_CATEGORIES.length} categories.`);
    } else {
        console.log(`Categories already exist (${categoryCount}). Skipping seed.`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
