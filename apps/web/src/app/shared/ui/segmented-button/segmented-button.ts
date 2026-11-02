import { Component, input, output } from '@angular/core';
import { MatButtonToggleModule, type MatButtonToggleChange } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export interface SegmentOption {
  value: string;
  label: string;
  icon?: string;
  /** Resolve `label` as an i18n key. */
  translate?: boolean;
}

/**
 * M3 segmented button: two to five mutually exclusive choices shown all at
 * once — the display mode in settings, what kind of surgery a row records.
 * Unlike filter chips, one segment is always selected.
 */
@Component({
  selector: 'tz-segmented-button',
  standalone: true,
  imports: [MatButtonToggleModule, MatIconModule, TranslatePipe],
  template: `
    <mat-button-toggle-group
      [value]="value()"
      (change)="onChange($event)"
      [attr.aria-label]="ariaLabel()"
    >
      @for (option of options(); track option.value) {
        <mat-button-toggle [value]="option.value">
          @if (option.icon) {
            <mat-icon class="tz-segment__icon" aria-hidden="true">{{ option.icon }}</mat-icon>
          }
          {{ option.translate ? (option.label | translate) : option.label }}
        </mat-button-toggle>
      }
    </mat-button-toggle-group>
  `,
  styles: `
    :host {
      display: inline-block;
      max-width: 100%;
    }

    .tz-segment__icon {
      font-size: var(--tz-icon-sm);
      margin-inline-end: var(--tz-space-2);
      vertical-align: middle;
    }
  `,
})
export class TzSegmentedButton {
  readonly options = input.required<readonly SegmentOption[]>();
  readonly value = input.required<string>();
  readonly ariaLabel = input.required<string>();
  readonly valueChange = output<string>();

  protected onChange(event: MatButtonToggleChange): void {
    this.valueChange.emit(String(event.value));
  }
}
