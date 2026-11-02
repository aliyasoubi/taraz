import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * The rounded panel every page is built from — a form section, a dashboard
 * chart, a detail-page card. Every screen in this app used to define its own
 * `.panel`/`.card`/`.section` CSS for what is visually one pattern; this is
 * that pattern as a single component, so its radius, border, and header
 * layout change in one place.
 *
 * By default an M3 *outlined* card: the page's own `surface` tone with an
 * outline-variant border. `tz-surface--low` is the *tonal* alternative — a
 * container tone and no border — and `tz-surface--elevated` lifts that tone
 * with a shadow, for the one card a screen is built around. One signal each,
 * never two. The looks themselves live in `styles/_surface.scss`.
 */
@Component({
  selector: 'tz-surface',
  standalone: true,
  imports: [MatIconModule],
  template: `
    @if (title()) {
      <header class="tz-surface__header">
        @if (icon()) {
          <mat-icon class="tz-surface__icon" aria-hidden="true">{{ icon() }}</mat-icon>
        }
        <h2 class="tz-surface__title">{{ title() }}</h2>
        @if (hint()) {
          <span class="tz-surface__hint">{{ hint() }}</span>
        }
      </header>
    }
    @if (description()) {
      <p class="tz-surface__description">{{ description() }}</p>
    }
    <div class="tz-surface__body">
      <ng-content />
    </div>
  `,
  styles: `
    @use '../../../../styles/surface';
    @use '../../../../styles/type';

    :host {
      @include surface.outlined;

      display: block;
      padding: var(--tz-space-4);

      @media (max-width: 700px) {
        padding: var(--tz-space-3);
      }
    }

    :host(.tz-surface--flush) {
      padding: 0;
      overflow: hidden;
    }

    :host(.tz-surface--low) {
      @include surface.tonal;

      /* Keep the 1px border box so a tonal and an outlined card line up. */
      border-color: transparent;
    }

    :host(.tz-surface--elevated) {
      @include surface.elevated;

      border-color: transparent;
    }

    .tz-surface__header {
      display: flex;
      align-items: baseline;
      gap: var(--tz-space-2);
      margin-bottom: var(--tz-space-3);
    }

    :host(.tz-surface--flush) .tz-surface__header {
      margin: var(--tz-space-4) var(--tz-space-4) 0;
    }

    .tz-surface__icon {
      font-size: var(--tz-icon-sm);
      color: var(--mat-sys-primary);
      align-self: center;
    }

    .tz-surface__title {
      margin: 0;
      font: var(--mat-sys-title-medium);
      font-weight: 600;
      color: var(--mat-sys-on-surface);
    }

    .tz-surface__hint {
      margin-inline-start: auto;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }

    .tz-surface__description {
      @include type.supporting-text;

      margin-bottom: var(--tz-space-4);
    }

    :host(.tz-surface--flush) .tz-surface__description {
      margin-inline: var(--tz-space-4);
    }

    :host(.tz-surface--flush) .tz-surface__body {
      padding: var(--tz-space-4);
    }
  `,
})
export class TzSurface {
  readonly title = input<string | null>(null);
  readonly icon = input<string | null>(null);
  /** A short note at the trailing end of the title row, e.g. "last 12 months". */
  readonly hint = input<string | null>(null);
  /** A sentence or two under the title explaining what the panel is for. */
  readonly description = input<string | null>(null);
}
