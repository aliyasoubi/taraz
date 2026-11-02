import { Component, input, output } from '@angular/core';

import { TzIconButton } from '../icon-button/icon-button';

/**
 * The title row at the top of every screen — a heading, an optional subtitle
 * or record count, and a primary action slot. Patients, the implant and
 * ortho registers, the surgery queue, settings and the dashboard all repeated
 * this same three-part layout by hand; this is that layout as one component.
 */
@Component({
  selector: 'tz-page-header',
  standalone: true,
  imports: [TzIconButton],
  template: `
    @if (backLabel(); as label) {
      <tz-icon-button
        class="tz-page-header__back"
        icon="arrow_forward"
        (click)="back.emit()"
        [ariaLabel]="label"
      />
    }
    <div class="tz-page-header__text">
      <div class="tz-page-header__title-row">
        <h1>{{ title() }}</h1>
        @if (count()) {
          <span class="tz-page-header__count">{{ count() }}</span>
        }
      </div>
      @if (subtitle()) {
        <p class="tz-page-header__subtitle">{{ subtitle() }}</p>
      }
    </div>
    <div class="tz-page-header__actions">
      <ng-content />
    </div>
  `,
  styles: `
    @use '../../../../styles/type';

    :host {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--tz-space-3);
      flex-wrap: wrap;
    }

    .tz-page-header__back {
      margin-top: calc(-1 * var(--tz-space-2));
    }

    .tz-page-header__text {
      flex: 1 1 240px;
      min-width: 0;
    }

    .tz-page-header__title-row {
      display: flex;
      align-items: baseline;
      gap: var(--tz-space-3);
      min-width: 0;
    }

    h1 {
      margin: 0;
      font: var(--mat-sys-headline-small);
      font-weight: 700;
      color: var(--mat-sys-on-surface);

      @media (max-width: 700px) {
        font-size: var(--mat-sys-title-large-size);
      }
    }

    .tz-page-header__count {
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
      white-space: nowrap;
    }

    .tz-page-header__subtitle {
      @include type.supporting-text;

      margin-top: var(--tz-space-1);
      max-width: 68ch;
    }

    .tz-page-header__actions {
      display: flex;
      align-items: center;
      gap: var(--tz-space-2);
      flex: 0 0 auto;
    }
  `,
})
export class TzPageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly backLabel = input<string | null>(null);
  readonly back = output<void>();
  /** Pre-formatted, e.g. "۱٬۶۵۶ پرونده" — callers keep their own count pipes. */
  readonly count = input<string | null>(null);
}
