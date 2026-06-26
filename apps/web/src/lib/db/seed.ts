/**
 * Idempotent seed: a system tenant with starter subjects, decks, and questions
 * plus the active prompt versions. Safe to run repeatedly (upserts by slug/key).
 *
 *   npm run db:seed
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import * as schema from './schema';
import { EVALUATE_ANSWER_PROMPT, GENERATE_QUESTION_PROMPT } from '@/lib/ai/prompts';

const SYSTEM_SLUG = 'vivavoce-system';

const STARTER = [
  {
    subject: { name: 'Medicine — Cardiology', slug: 'cardiology', color: '#7C2D3A' },
    deck: { title: 'Cardiology Viva Core', difficulty: 'advanced' as const },
    questions: [
      'Walk me through your approach to a patient presenting with acute chest pain.',
      'Explain the pathophysiology of heart failure with reduced ejection fraction.',
      'How would you interpret an ECG showing ST elevation in leads II, III, and aVF?',
    ],
  },
  {
    subject: { name: 'Software Interviews', slug: 'software-interviews', color: '#D9803B' },
    deck: { title: 'Behavioural & System Design', difficulty: 'intermediate' as const },
    questions: [
      'Tell me about a time you disagreed with a teammate. How did you resolve it?',
      'Design a URL shortener. Walk me through your data model and scaling plan.',
      'How do you decide when to pay down technical debt versus shipping features?',
    ],
  },
  {
    subject: { name: 'Public Speaking', slug: 'public-speaking', color: '#5C7A6B' },
    deck: { title: 'Explain It Simply', difficulty: 'intro' as const },
    questions: [
      'Explain how a recommendation algorithm works to a non-technical audience.',
      'In one minute, make the case for why your project deserves funding.',
      'Summarise a complex topic you know well as if teaching a curious teenager.',
    ],
  },
];

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DIRECT_URL or DATABASE_URL is required for seeding');
  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool, { schema });

  // System tenant
  let [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, SYSTEM_SLUG));
  if (!tenant) {
    [tenant] = await db
      .insert(schema.tenants)
      .values({ name: 'VivaVoce System', slug: SYSTEM_SLUG, kind: 'organization' })
      .returning();
    console.log('✓ created system tenant');
  }

  // System owner user (service identity used to own seed content)
  let [owner] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.clerkUserId, 'system'));
  if (!owner) {
    [owner] = await db
      .insert(schema.users)
      .values({
        clerkUserId: 'system',
        email: 'system@vivavoce.app',
        displayName: 'VivaVoce',
        primaryTenantId: tenant!.id,
      })
      .returning();
  }

  for (const block of STARTER) {
    let [subject] = await db
      .select()
      .from(schema.subjects)
      .where(
        and(
          eq(schema.subjects.tenantId, tenant!.id),
          eq(schema.subjects.slug, block.subject.slug),
        ),
      );
    if (!subject) {
      [subject] = await db
        .insert(schema.subjects)
        .values({ ...block.subject, tenantId: tenant!.id, isSystem: true })
        .returning();
    }

    const existingDeck = await db
      .select()
      .from(schema.decks)
      .where(
        and(
          eq(schema.decks.tenantId, tenant!.id),
          eq(schema.decks.title, block.deck.title),
        ),
      );
    if (existingDeck.length === 0) {
      const [deck] = await db
        .insert(schema.decks)
        .values({
          tenantId: tenant!.id,
          subjectId: subject!.id,
          ownerId: owner!.id,
          title: block.deck.title,
          difficulty: block.deck.difficulty,
          source: 'system',
        })
        .returning();
      await db.insert(schema.questions).values(
        block.questions.map((prompt) => ({
          tenantId: tenant!.id,
          deckId: deck!.id,
          prompt,
          difficulty: block.deck.difficulty,
        })),
      );
      console.log(`✓ seeded deck "${block.deck.title}" (${block.questions.length} questions)`);
    }
  }

  // Prompt versions (idempotent by key+version)
  for (const p of [
    { key: 'evaluate_answer', version: 1, template: EVALUATE_ANSWER_PROMPT },
    { key: 'generate_question', version: 1, template: GENERATE_QUESTION_PROMPT },
  ]) {
    const exists = await db
      .select()
      .from(schema.promptVersions)
      .where(
        and(
          eq(schema.promptVersions.key, p.key),
          eq(schema.promptVersions.version, p.version),
        ),
      );
    if (exists.length === 0) {
      await db.insert(schema.promptVersions).values({ ...p, active: true });
      console.log(`✓ registered prompt ${p.key} v${p.version}`);
    }
  }

  await pool.end();
  console.log('✓ seed complete');
}

main().catch((err) => {
  console.error('✗ seed failed:', err);
  process.exit(1);
});
