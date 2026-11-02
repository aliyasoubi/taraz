import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

import { Notifier } from '../../core/i18n/api-error';
import type { Account, Entry, Payment } from '../../core/models/api.model';
import { Api } from '../../core/services/api.service';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { TzButton } from '../../shared/ui';
import { PaymentFields, paymentForm, paymentInput } from './payment-fields';

export interface PaymentDialogData {
  entry: Entry;
  accounts: Account[];
  /** Absent: a new payment against `entry`. */
  payment?: Payment;
}

/** Add or change one payment on an entry. Closes with the updated entry. */
@Component({
  selector: 'tz-payment-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    TranslatePipe,
    MoneyPipe,
    TzButton,
    PaymentFields,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ (data.payment ? 'payment.editTitle' : 'payment.addTitle') | translate }}
    </h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        @if (!data.payment && data.entry.remaining > 0) {
          <p class="remaining">
            {{ 'payment.remainingHint' | translate: { amount: (data.entry.remaining | money) } }}
            <tz-button variant="text" icon="done_all" (click)="fillRemaining()">
              {{ 'payment.fillRemaining' | translate }}
            </tz-button>
          </p>
        }
        <tz-payment-fields [form]="form" [accounts]="data.accounts" />
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <tz-button variant="text" (click)="ref.close()">{{
          'action.cancel' | translate
        }}</tz-button>
        <tz-button type="submit" icon="check" [loading]="busy()">{{
          'action.save' | translate
        }}</tz-button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-dialog-content {
      min-width: min(560px, 82vw);
      padding-top: var(--tz-space-2) !important;
    }
    .remaining {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--tz-space-2);
      margin: 0 0 var(--tz-space-3);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class PaymentDialog {
  protected readonly data = inject<PaymentDialogData>(MAT_DIALOG_DATA);
  protected readonly ref = inject<MatDialogRef<PaymentDialog, Entry>>(MatDialogRef);
  private readonly api = inject(Api);
  private readonly notifier = inject(Notifier);

  protected readonly form = paymentForm(this.data.payment);
  protected readonly busy = signal(false);

  protected fillRemaining(): void {
    this.form.controls.amount.setValue(this.data.entry.remaining);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    const input = paymentInput(this.form);
    const payment = this.data.payment;
    (payment
      ? this.api.updatePayment(payment.id, input)
      : this.api.addPayment(this.data.entry.id, input)
    ).subscribe({
      next: (entry) => {
        this.notifier.done(payment ? 'payment.updated' : 'payment.saved');
        this.ref.close(entry);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.notifier.error(err);
      },
    });
  }
}
