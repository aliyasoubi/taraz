import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';

import { compactMoney, formatMoney } from '../lib/money';

/**
 * A month total at a glance: «۲۷٫۹ میلیارد» large, the exact rials beneath.
 * `count` tiles show a plain number instead.
 */
@Component({
  selector: 'tz-money-tile',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule, TranslatePipe],
  template: `
    <mat-icon class="tile__icon" aria-hidden="true">{{ icon() }}</mat-icon>
    <span class="tile__value">
      {{ parts().value }}
      @if (parts().unitKey; as unit) {
        <small>{{ unit | translate }}</small>
      }
    </span>
    <span class="tile__label">{{ label() }}</span>
    @if (!count()) {
      <span class="tile__exact">{{ exact() }} {{ 'money.rial' | translate }}</span>
    }
  `,
  host: {
    class: 'tile',
    '[class.tile--warn]': "tone() === 'warn' && value() > 0",
    '[class.tile--good]': "tone() === 'good' && value() > 0",
  },
  styles: `
    @use '../../../styles/surface';

    :host {
      @include surface.outlined;

      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      padding: var(--tz-space-4);
    }
    .tile__icon {
      font-size: var(--tz-icon-md);
      color: var(--mat-sys-primary);
      margin-block-end: var(--tz-space-1);
    }
    .tile__value {
      font: var(--mat-sys-headline-medium);
      font-weight: 700;
      font-feature-settings: var(--tz-font-numeric);
      line-height: 1.2;

      small {
        font: var(--mat-sys-title-small);
        color: var(--mat-sys-on-surface-variant);
      }
    }
    .tile__label {
      font: var(--mat-sys-title-small);
      color: var(--mat-sys-on-surface);
    }
    .tile__exact {
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
      font-feature-settings: var(--tz-font-numeric);
    }
    :host(.tile--warn) {
      .tile__icon,
      .tile__value {
        color: var(--mat-sys-error);
      }
    }
    :host(.tile--good) {
      .tile__icon,
      .tile__value {
        color: var(--tz-on-success-container);
      }
    }
    @media (max-width: 600px) {
      :host {
        padding: var(--tz-space-3);
      }
      .tile__value {
        font: var(--mat-sys-headline-small);
        font-weight: 700;
      }
    }
  `,
})
export class MoneyTile {
  readonly value = input.required<number>();
  readonly label = input.required<string>();
  readonly icon = input.required<string>();
  readonly tone = input<'neutral' | 'warn' | 'good'>('neutral');
  /** A count of people, not rials. */
  readonly count = input(false);

  protected readonly parts = computed(() =>
    this.count() ? { value: formatMoney(this.value()), unitKey: null } : compactMoney(this.value()),
  );
  protected readonly exact = computed(() => formatMoney(this.value()));
}
