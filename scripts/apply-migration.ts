import postgres from 'postgres';

async function applyMigration() {
    const sql = postgres(process.env.DATABASE_URL!);

    try {
        await sql`ALTER TABLE flows ADD COLUMN IF NOT EXISTS secure_headers jsonb DEFAULT '["authorization"]'::jsonb`;
        console.log('✅ Migration applied: secure_headers column added to flows table');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await sql.end();
    }
}

applyMigration();
