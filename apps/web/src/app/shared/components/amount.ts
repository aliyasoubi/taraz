import { Component, computed, input } from '@angular/core';

import { formatMoney } from '../lib/money';
import { balanceTone } from '../labels';

/**
 * An amount in rials, tabular Persian digits. `tone="balance"` colours it the
 * way a balance reads: owed in the error tone, credit in the success tone,
 * settled muted — and shows a credit without its minus sign.
 */
@Component({
  selector: 'tz-amount',
  standalone: true,
  template: `{{ text() }}`,
  host: {
    class: 'tz-amount',
    '[class.tz-amount--debt]': "tone() === 'balance' && kind() === 'debt'",
    '[class.tz-amount--credit]': "tone() === 'balance' && kind() === 'credit'",
    '[class.tz-amount--settled]': "tone() === 'balance' && kind() === 'settled'",
    '[class.tz-amount--muted]': 'muted() || (value() === 0 && tone() !== "balance")',
  },
  styles: `
    :host {
      font-feature-settings: var(--tz-font-numeric);
      white-space: nowrap;
      unicode-bidi: isolate;
    }
    :host(.tz-amount--debt) {
      color: var(--mat-sys-error);
      font-weight: 600;
    }
    :host(.tz-amount--credit) {
      color: var(--tz-on-success-container);
      font-weight: 600;
    }
    :host(.tz-amount--settled),
    :host(.tz-amount--muted) {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class Amount {
  readonly value = input.required<number>();
  readonly tone = input<'plain' | 'balance'>('plain');
  /** Show a zero as a dash, for sparse ledger columns. */
  readonly dashZero = input(false);
  readonly muted = input(false);

  protected readonly kind = computed(() => balanceTone(this.value()));
  protected readonly text = computed(() => {
    const value = this.value();
    if (value === 0 && this.dashZero()) return '—';
    return formatMoney(this.tone() === 'balance' ? Math.abs(value) : value);
  });
}
