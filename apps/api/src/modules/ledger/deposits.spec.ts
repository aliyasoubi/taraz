import { planDeposits } from './deposits';

describe('planDeposits', () => {
  it('moves a deposit smaller than the cost whole, and empties it', () => {
    const plan = planDeposits(30, [{ id: 'x1', entryId: 'd1', amount: 5 }]);
    expect(plan).toEqual({
      move: ['x1'],
      split: null,
      emptied: ['d1'],
      applied: 5,
    });
  });

  it('splits the payment that covers more than is owed, keeping the rest', () => {
    const plan = planDeposits(7, [
      { id: 'x1', entryId: 'd1', amount: 5 },
      { id: 'x2', entryId: 'd1', amount: 5 },
    ]);
    expect(plan).toEqual({
      move: ['x1'],
      split: { id: 'x2', amount: 2 },
      emptied: [],
      applied: 7,
    });
  });

  it('takes deposits oldest first and leaves the untouched ones', () => {
    const plan = planDeposits(5, [
      { id: 'x1', entryId: 'd1', amount: 5 },
      { id: 'x2', entryId: 'd2', amount: 3 },
    ]);
    expect(plan).toEqual({
      move: ['x1'],
      split: null,
      emptied: ['d1'],
      applied: 5,
    });
  });

  it('applies nothing when nothing is held', () => {
    expect(planDeposits(10, [])).toEqual({
      move: [],
      split: null,
      emptied: [],
      applied: 0,
    });
  });
});
