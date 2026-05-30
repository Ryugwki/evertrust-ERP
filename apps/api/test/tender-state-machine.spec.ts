import type { TenderStatus } from '@evertrust/shared';
import {
  STATE_MACHINE,
  canTransition,
} from '../src/tenders/tender-state-machine';

// WHY: the lifecycle is the core domain rule of M1. An illegal transition that
// slips through (or a legal one that gets blocked) corrupts operational state.
// These tests pin the exact adjacency the API + web both depend on.
describe('tender STATE_MACHINE', () => {
  it('allows a defined forward transition (DETECTED -> QUALIFIED)', () => {
    expect(canTransition('DETECTED', 'QUALIFIED')).toBe(true);
  });

  it('allows dropping any non-terminal state to LOST (PRICING -> LOST)', () => {
    expect(canTransition('PRICING', 'LOST')).toBe(true);
  });

  it('rejects a skip-ahead transition (DETECTED -> SUBMITTED)', () => {
    expect(canTransition('DETECTED', 'SUBMITTED')).toBe(false);
  });

  it('rejects any transition out of a terminal state (WON, LOST)', () => {
    const all: TenderStatus[] = [
      'DETECTED',
      'QUALIFIED',
      'OPEN',
      'PRICING',
      'APPROVAL',
      'SUBMITTED',
      'WON',
      'LOST',
    ];
    for (const to of all) {
      expect(canTransition('WON', to)).toBe(false);
      expect(canTransition('LOST', to)).toBe(false);
    }
    expect(STATE_MACHINE.WON).toHaveLength(0);
    expect(STATE_MACHINE.LOST).toHaveLength(0);
  });

  it('never lists a state as its own successor (no self-loops)', () => {
    for (const [from, tos] of Object.entries(STATE_MACHINE)) {
      expect(tos).not.toContain(from);
    }
  });
});
