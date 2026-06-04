import { NotFoundException } from '@nestjs/common';
import { schema } from '@evertrust/db';
import { PersonasService } from '../src/meetings/personas.service';
import { FakeTable, makeFakeDb } from './fake-db';

const ORG = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function svc(seed: Record<string, unknown>[] = []) {
  const personas = new FakeTable(seed);
  const { db } = makeFakeDb(
    new Map<unknown, FakeTable>([[schema.personas, personas]]),
  );
  return { service: new PersonasService(db), personas };
}

describe('PersonasService', () => {
  it('auto-provisions a default Alex Hormozi persona when none exist', async () => {
    const { service, personas } = svc();
    const list = await service.list(ORG);
    expect(list).toHaveLength(1);
    expect(list[0]!.name).toBe('Alex Hormozi');
    expect(list[0]!.systemPrompt.length).toBeGreaterThan(0);
    expect(personas.rows).toHaveLength(1);
  });

  it('creates and then deletes a persona', async () => {
    const { service } = svc([
      {
        id: 'p1',
        organizationId: ORG,
        name: 'Alex Hormozi',
        systemPrompt: 'x',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        __seq: 1,
      },
    ]);
    const created = await service.create(ORG, {
      name: 'Challenger',
      systemPrompt: 'Teach-Tailor-Take control.',
    });
    expect(created.name).toBe('Challenger');
    const removed = await service.remove(ORG, created.id);
    expect(removed.id).toBe(created.id);
  });

  it('404s deleting an unknown persona', async () => {
    const { service } = svc();
    await expect(service.remove(ORG, 'nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
