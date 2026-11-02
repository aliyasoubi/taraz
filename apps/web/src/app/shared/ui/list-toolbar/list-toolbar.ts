import { Component, ViewEncapsulation } from '@angular/core';

/**
 * The controls above a list, laid out the same on every list page:
 *
 * 1. a row of 56dp controls — the search bar, and beside it whatever the page
 *    needs: a dropdown (`tz-select-field subscript="dynamic"`) or a button —
 *    every one the same height, on one top and bottom edge;
 * 2. a row of 32dp filter chips (`tz-filter-chips`) under it.
 *
 * A 56dp bar and 32dp chips never share a line. On a phone a dropdown moves
 * under the search, full width, and the chips stay one line that scrolls
 * sideways, as in Gmail and Drive, rather than wrapping into a block.
 *
 * Unencapsulated on purpose, like `tz-field-grid`: the rules have to reach the
 * projected controls, which carry the page's style scope. Every selector
 * starts at `tz-list-toolbar`, so nothing leaks beyond it.
 */
@Component({
  selector: 'tz-list-toolbar',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="tz-list-toolbar__bar"><ng-content /></div>
    <div class="tz-list-toolbar__chips"><ng-content select="tz-filter-chips" /></div>
  `,
  styles: `
    tz-list-toolbar {
      display: flex;
      flex-direction: column;
      gap: var(--tz-space-3);
      min-width: 0;
    }

    tz-list-toolbar > .tz-list-toolbar__bar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: var(--tz-space-3);
    }

    tz-list-toolbar > .tz-list-toolbar__bar > tz-search-field {
      flex: 1 1 280px;
      min-width: 0;
    }

    tz-list-toolbar > .tz-list-toolbar__bar > tz-select-field {
      flex: 0 1 240px;
      min-width: 180px;
    }

    /* A button on the bar is as tall as the bar. */
    tz-list-toolbar > .tz-list-toolbar__bar > tz-button {
      flex: 0 0 auto;
      --mat-button-outlined-container-height: var(--tz-search-height);
      --mat-button-filled-container-height: var(--tz-search-height);
      --mat-button-text-container-height: var(--tz-search-height);
    }

    tz-list-toolbar > .tz-list-toolbar__chips {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0 var(--tz-space-2);
      min-width: 0;
    }

    tz-list-toolbar > .tz-list-toolbar__chips:empty {
      display: none;
    }

    @media (max-width: 599.98px) {
      /* The search keeps an icon-only button beside it; a dropdown takes
         the next line, full width. */
      tz-list-toolbar > .tz-list-toolbar__bar > tz-search-field {
        flex-basis: 200px;
      }

      tz-list-toolbar > .tz-list-toolbar__bar > tz-select-field {
        flex-basis: 100%;
      }

      /* One line that scrolls sideways; the bar's edge clips it, so a chip
         cut at the edge says there is more. */
      tz-list-toolbar > .tz-list-toolbar__chips {
        flex-wrap: nowrap;
        overflow-x: auto;
        overscroll-behavior-x: contain;
        scrollbar-width: none;
      }

      tz-list-toolbar > .tz-list-toolbar__chips::-webkit-scrollbar {
        display: none;
      }

      tz-list-toolbar > .tz-list-toolbar__chips > tz-filter-chips {
        flex: none;
      }

      tz-list-toolbar > .tz-list-toolbar__chips .mdc-evolution-chip-set__chips {
        flex-wrap: nowrap;
      }
    }
  `,
})
export class TzListToolbar {}
