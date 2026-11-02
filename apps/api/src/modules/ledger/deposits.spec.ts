import { planDeposits, takesDeposits } from './deposits';

const held = (id: string, entryId: string, amount: number) => ({
  id,
  entryId,
  amount,
});

describe('planDeposits', () => {
  it('moves a deposit smaller than the cost whole, and empties it', () => {
    const x1 = held('x1', 'd1', 5);
    expect(planDeposits(30, [x1])).toEqual({
      move: [x1],
      split: null,
      emptied: ['d1'],
      applied: 5,
    });
  });

  it('splits the payment that covers more than is owed, keeping the rest', () => {
    const [x1, x2] = [held('x1', 'd1', 5), held('x2', 'd1', 5)];
    expect(planDeposits(7, [x1, x2])).toEqual({
      move: [x1],
      split: { payment: x2, amount: 2 },
      emptied: [],
      applied: 7,
    });
  });

  it('takes deposits oldest first and leaves the untouched ones', () => {
    const [x1, x2] = [held('x1', 'd1', 5), held('x2', 'd2', 3)];
    expect(planDeposits(5, [x1, x2])).toEqual({
      move: [x1],
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

describe('takesDeposits', () => {
  it('only for a cost with something still owing', () => {
    expect(takesDeposits({ category: 'implant', remaining: 10 })).toBe(true);
    expect(takesDeposits({ category: 'implant', remaining: 0 })).toBe(false);
    expect(takesDeposits({ category: 'deposit', remaining: 10 })).toBe(false);
  });
});
