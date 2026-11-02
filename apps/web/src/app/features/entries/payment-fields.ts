import { Component, computed, input } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import type { Account, Payment, PaymentInput } from '../../core/models/api.model';
import { fromIsoDay, toIsoDay, today } from '../../shared/lib/jalali';
import {
  TzDateField,
  TzFieldGrid,
  TzMoneyField,
  TzSelectField,
  TzTextField,
  type SelectOption,
  type TextFieldOption,
} from '../../shared/ui';

export type PaymentForm = FormGroup<{
  amount: FormControl<number | null>;
  date: FormControl<Date | null>;
  payerName: FormControl<string>;
  source: FormControl<string>;
  accountId: FormControl<string>;
}>;

export function paymentForm(payment?: Payment, date: Date = today()): PaymentForm {
  return new FormGroup({
    amount: new FormControl<number | null>(payment?.amount ?? null, [
      Validators.required,
      Validators.min(1),
    ]),
    date: new FormControl<Date | null>(
      payment ? fromIsoDay(payment.date) : date,
      Validators.required,
    ),
    payerName: new FormControl(payment?.payerName ?? '', { nonNullable: true }),
    source: new FormControl(payment?.source ?? '', { nonNullable: true }),
    accountId: new FormControl(payment?.account?.id ?? '', { nonNullable: true }),
  });
}

export function paymentInput(form: PaymentForm): PaymentInput {
  const v = form.getRawValue();
  return {
    amount: v.amount ?? 0,
    date: toIsoDay(v.date ?? today()),
    payerName: v.payerName.trim() || null,
    source: v.source.trim() || null,
    accountId: v.accountId || null,
  };
}

/**
 * One payment, recorded like a transfer: how much and when, who paid, from
 * where, into which account. Shared by the entry form and the payment dialog.
 */
@Component({
  selector: 'tz-payment-fields',
  standalone: true,
  imports: [TranslatePipe, TzDateField, TzFieldGrid, TzMoneyField, TzSelectField, TzTextField],
  template: `
    <tz-field-grid>
      <tz-money-field
        [control]="form().controls.amount"
        [label]="'payment.amount' | translate"
        [errorMessages]="{ min: 'field.amountPositive' | translate }"
      />
      <tz-date-field [control]="form().controls.date" [label]="'payment.date' | translate" />
      <tz-text-field
        [control]="form().controls.payerName"
        [label]="'payment.payer' | translate"
        [hint]="'payment.payerHint' | translate"
        [placeholder]="'payment.patientPaid' | translate"
        prefixIcon="person"
      />
      <tz-text-field
        [control]="form().controls.source"
        [label]="'payment.source' | translate"
        [hint]="'payment.sourceHint' | translate"
        [options]="sourceOptions()"
        prefixIcon="output"
      />
      <tz-select-field
        class="account"
        [control]="form().controls.accountId"
        [options]="accountOptions()"
        [label]="'payment.account' | translate"
        [hint]="'payment.accountHint' | translate"
        [anyLabel]="'payment.noAccount' | translate"
      />
    </tz-field-grid>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class PaymentFields {
  readonly form = input.required<PaymentForm>();
  readonly accounts = input.required<readonly Account[]>();
  /** Banks people have paid from before, offered as they type. */
  readonly sources = input<readonly string[]>([]);

  protected readonly accountOptions = computed<SelectOption[]>(() => {
    const selected = this.form().controls.accountId.value;
    return this.accounts()
      .filter((a) => a.active || a.id === selected)
      .map((a) => ({
        value: a.id,
        label: a.holder ? `${a.title} — ${a.holder}` : a.title,
      }));
  });

  protected readonly sourceOptions = computed<TextFieldOption[] | null>(() =>
    this.sources().length ? this.sources().map((value) => ({ value, label: value })) : null,
  );
}
