import 'dotenv/config';
import argon2 from 'argon2';
import { db } from './client';
import {
  authCredentials,
  customers,
  suppliers,
  tenders,
  users,
} from './schema';

// Dev-only password for the two seeded users. NOT for any deployed environment.
const DEV_PASSWORD = 'Password123!';

// Minimal sample data for local/dev bootstrap. Run with `pnpm db:seed`.
// Safe to compile without a database; only inserts when executed.
async function seed(): Promise<void> {
  const [admin, pic] = await db
    .insert(users)
    .values([
      { name: 'Ada Admin', email: 'admin@evertrust-germany.de', role: 'ADMIN' },
      { name: 'Pia PIC', email: 'pic@evertrust-germany.de', role: 'PIC' },
    ])
    .returning();

  // Each seeded user gets an argon2 credential so local login works out of the box.
  const passwordHash = await argon2.hash(DEV_PASSWORD);
  await db.insert(authCredentials).values(
    [admin, pic]
      .filter((u): u is NonNullable<typeof u> => Boolean(u))
      .map((u) => ({ userId: u.id, passwordHash })),
  );

  const [customer] = await db
    .insert(customers)
    .values({
      name: 'Stadtwerke Musterstadt',
      contact: 'einkauf@musterstadt.de',
      niches: ['water', 'energy'],
    })
    .returning();

  await db.insert(suppliers).values([
    {
      name: 'Rohr & Ventil GmbH',
      niches: ['water'],
      capabilities: ['valves', 'pipes'],
      fitScore: '0.84',
      contact: 'sales@rohrventil.de',
    },
    {
      name: 'ElektroTech AG',
      niches: ['energy'],
      capabilities: ['cabling', 'transformers'],
      fitScore: '0.71',
      contact: 'vertrieb@elektrotech.de',
    },
  ]);

  await db.insert(tenders).values([
    {
      externalId: 'DE-2026-000123',
      source: 'dtvp',
      title: 'Erneuerung Trinkwasserleitung Nord',
      buyer: 'Stadt Musterstadt',
      customerId: customer?.id,
      regime: 'VgV',
      niche: 'water',
      status: 'QUALIFIED',
      estimatedValue: '450000.00',
      isAboveThreshold: true,
      location: 'Musterstadt',
    },
    {
      externalId: 'DE-2026-000456',
      source: 'evergabe',
      title: 'Wartung Trafostationen',
      buyer: 'Landkreis Beispiel',
      regime: 'UVgO',
      niche: 'energy',
      status: 'DETECTED',
      estimatedValue: '85000.00',
      isAboveThreshold: false,
      location: 'Beispielstadt',
    },
  ]);

  // Reference seeded users so the bindings are not flagged as unused.
  console.log(`Seeded users: ${admin?.email}, ${pic?.email}`);
}

seed()
  .then(() => {
    console.log('Seed complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
