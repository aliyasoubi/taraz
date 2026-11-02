import { Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { PersianCountPipe } from '../../pipes/persian-number.pipe';

export type StatTileTone = 'neutral' | 'caution' | 'warn';

/**
 * One number with its icon and label — the dashboard's work tiles and the
 * statistics page's totals. With `link` set the whole tile opens the list
 * the number counts, so a tile should link to exactly those rows.
 *
 * `warn` and `caution` are requests, not colours: the tile turns to the
 * error or the warning container only while there is something to act on,
 * so a zero never shouts. `warn` is for what is slipping (a patient past
 * their follow-up); `caution` for routine work that is due (stock to order),
 * so not every count on the dashboard looks like an alarm.
 */
@Component({
  selector: 'tz-stat-tile',
  standalone: true,
  imports: [MatIconModule, NgTemplateOutlet, PersianCountPipe, RouterLink],
  template: `
    @if (link(); as link) {
      <a class="tz-stat-tile__body" [routerLink]="link" [queryParams]="queryParams()">
        <ng-container [ngTemplateOutlet]="content" />
      </a>
    } @else {
      <div class="tz-stat-tile__body">
        <ng-container [ngTemplateOutlet]="content" />
      </div>
    }

    <ng-template #content>
      <mat-icon class="tz-stat-tile__icon" aria-hidden="true">{{ icon() }}</mat-icon>
      <span class="tz-stat-tile__value">{{ value() | faCount }}</span>
      <span class="tz-stat-tile__label">{{ label() }}</span>
    </ng-template>
  `,
  host: {
    class: 'tz-stat-tile',
    '[class.tz-stat-tile--warn]': "active() && tone() === 'warn'",
    '[class.tz-stat-tile--caution]': "active() && tone() === 'caution'",
  },
  styles: `
    @use '../../../../styles/surface';

    :host {
      display: block;
      min-width: 0;
    }

    .tz-stat-tile__body {
      @include surface.outlined;

      display: flex;
      flex-direction: column;
      gap: var(--tz-space-1);
      height: 100%;
      padding: var(--tz-space-4);
      text-decoration: none;
      color: inherit;
      transition:
        border-color 160ms ease,
        transform 160ms ease;
    }

    a.tz-stat-tile__body:hover {
      border-color: var(--mat-sys-primary);
      transform: translateY(-2px);
    }

    .tz-stat-tile__icon {
      font-size: var(--tz-icon-md);
      color: var(--mat-sys-primary);
      margin-bottom: var(--tz-space-1);
    }

    .tz-stat-tile__value {
      font-size: var(--mat-sys-headline-medium-size);
      font-weight: 700;
      line-height: 1.15;
    }

    .tz-stat-tile__label {
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
    }

    :host(.tz-stat-tile--warn) .tz-stat-tile__body {
      border-color: color-mix(in srgb, var(--mat-sys-error) 40%, transparent);
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);

      .tz-stat-tile__icon {
        color: var(--mat-sys-error);
      }
    }

    :host(.tz-stat-tile--caution) .tz-stat-tile__body {
      border-color: color-mix(in srgb, var(--tz-on-warning-container) 30%, transparent);
      background: var(--tz-warning-container);
      color: var(--tz-on-warning-container);

      .tz-stat-tile__icon {
        color: inherit;
      }
    }

    :host(.tz-stat-tile--warn),
    :host(.tz-stat-tile--caution) {
      .tz-stat-tile__label {
        color: inherit;
        opacity: 0.85;
      }
    }
  `,
})
export class TzStatTile {
  /** Already translated. */
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly icon = input.required<string>();
  /** The list the number counts; without it the tile is a plain figure. */
  readonly link = input<string | null>(null);
  readonly queryParams = input<Record<string, string> | null>(null);
  readonly tone = input<StatTileTone>('neutral');

  protected readonly active = computed(() => this.tone() !== 'neutral' && this.value() > 0);
}
