import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

// Not from the `../ui` barrel: the unsaved-changes guard opens this dialog and
// is imported eagerly by the routes, so a barrel import here pulled every
// field component (datepicker, autocomplete, …) into the initial bundle —
// about 90 kB over budget.
import { TzButton } from '../ui/button/button';

export interface ConfirmData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'warn';
}

/** Shared confirmation prompt for anything that changes a record irreversibly. */
@Component({
  selector: 'tz-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, TzButton, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="message">{{ data.message }}</p>
    </mat-dialog-content>
    <!-- M3 basic dialogs use text buttons for every action — a filled button
         is the full-screen dialog's idiom. Archiving is still destructive from
         the user's point of view, so that one action takes the danger tone.
         It also starts on Cancel: Enter on a dialog that just opened must not
         archive or discard. -->
    <mat-dialog-actions align="end">
      <tz-button
        variant="text"
        (click)="ref.close(false)"
        [attr.cdkFocusInitial]="data.tone === 'warn' ? '' : null"
      >
        {{ data.cancelLabel ?? ('action.cancel' | translate) }}
      </tz-button>
      <tz-button
        variant="text"
        [tone]="data.tone === 'warn' ? 'danger' : 'default'"
        (click)="ref.close(true)"
        [attr.cdkFocusInitial]="data.tone === 'warn' ? null : ''"
      >
        {{ data.confirmLabel ?? ('action.confirm' | translate) }}
      </tz-button>
    </mat-dialog-actions>
  `,
  styles: `
    .message {
      margin: 0;
      line-height: 1.9;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class ConfirmDialog {
  protected readonly ref = inject<MatDialogRef<ConfirmDialog, boolean>>(MatDialogRef);
  protected readonly data = inject<ConfirmData>(MAT_DIALOG_DATA);
}
