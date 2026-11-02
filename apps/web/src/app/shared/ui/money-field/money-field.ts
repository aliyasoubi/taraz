import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { formatMoney, parseMoney } from '../../lib/money';
import { type NumberWords, persianWords } from '../../lib/persian-words';
import { firstErrorMessage } from '../field-errors';

/**
 * An amount in rials. Digits group as they are typed (Persian or Latin, any
 * separators), and the amount is spelled out underneath — «دویست و شصت میلیون
 * ریال» — so a missing or extra zero is caught before it is saved.
 *
 * Bound to a `FormControl<number | null>`: the form holds the number, the
 * field owns the text.
 */
@Component({
  selector: 'tz-money-field',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, TranslatePipe],
  template: `
    <mat-form-field appearance="outline" subscriptSizing="dynamic">
      @if (label()) {
        <mat-label>{{ label() }}</mat-label>
      }
      <input
        matInput
        inputmode="numeric"
        autocomplete="off"
        class="tz-money-field__input"
        [formControl]="text"
        (blur)="control().markAsTouched()"
      />
      <span matTextSuffix class="tz-money-field__unit">{{ 'money.rial' | translate }}</span>
      @if (errorText(); as message) {
        <mat-error>{{ message }}</mat-error>
      } @else if (words()) {
        <mat-hint class="tz-money-field__words">{{ words() }}</mat-hint>
      } @else if (hint()) {
        <mat-hint>{{ hint() }}</mat-hint>
      }
    </mat-form-field>
  `,
  styles: `
    :host {
      display: block;
    }
    mat-form-field {
      width: 100%;
    }
    .tz-money-field__input {
      font-feature-settings: var(--tz-font-numeric);
      font-size: 1.05em;
      letter-spacing: 0.02em;
    }
    .tz-money-field__unit {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
      padding-inline-start: var(--tz-space-2);
    }
    .tz-money-field__words {
      color: var(--mat-sys-primary);
    }
  `,
})
export class TzMoneyField implements OnInit {
  private readonly i18n = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly control = input.required<FormControl<number | null>>();
  readonly label = input('');
  readonly hint = input<string | null>(null);
  readonly errorMessages = input<Readonly<Record<string, string>>>({});

  protected readonly text = new FormControl('', { nonNullable: true });
  private readonly value = signal<number | null>(null);
  /** Bumped on every status change, so the error line follows the outer control. */
  private readonly status = signal(0);

  protected readonly words = computed(() => {
    const value = this.value();
    return value
      ? this.i18n.instant('money.words', {
          words: persianWords(value, this.i18n.instant('numberWords') as NumberWords),
        })
      : '';
  });

  protected readonly errorText = computed(() => {
    this.status();
    const control = this.control();
    if (!control.touched && !this.text.value) return null;
    if (Number.isNaN(parseMoney(this.text.value))) return this.i18n.instant('field.amountInvalid');
    return firstErrorMessage(control.errors, this.i18n, this.errorMessages());
  });

  ngOnInit(): void {
    const control = this.control();
    this.show(control.value);
    control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      if (value !== parseMoney(this.text.value)) this.show(value);
      this.value.set(value);
    });
    control.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.status.update((n) => n + 1));
    this.text.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((typed) => {
      const parsed = parseMoney(typed);
      const value = parsed === null || Number.isNaN(parsed) ? null : parsed;
      if (parsed !== null && !Number.isNaN(parsed)) {
        const grouped = formatMoney(parsed);
        if (grouped !== typed) this.text.setValue(grouped, { emitEvent: false });
      }
      control.setValue(value);
      control.markAsDirty();
    });
  }

  private show(value: number | null): void {
    this.text.setValue(value === null ? '' : formatMoney(value), { emitEvent: false });
    this.value.set(value);
  }
}
