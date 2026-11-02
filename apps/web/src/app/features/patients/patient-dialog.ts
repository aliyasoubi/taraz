import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

import { Notifier } from '../../core/i18n/api-error';
import type { PatientSummary } from '../../core/models/api.model';
import { Api } from '../../core/services/api.service';
import { TzButton, TzTextareaField, TzTextField } from '../../shared/ui';

export interface PatientDialogData {
  patient?: { id: string; name: string; phone: string | null; note: string | null };
}

/** A patient's name, phone and note — new or edited. Closes with the saved patient. */
@Component({
  selector: 'tz-patient-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    TranslatePipe,
    TzButton,
    TzTextField,
    TzTextareaField,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ (data.patient ? 'patient.dialogEdit' : 'patient.dialogNew') | translate }}
    </h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="fields">
        <tz-text-field
          [control]="form.controls.name"
          [label]="'patient.name' | translate"
          prefixIcon="person"
        />
        <tz-text-field
          [control]="form.controls.phone"
          [label]="'patient.phone' | translate"
          prefixIcon="call"
          type="tel"
          inputmode="tel"
          [ltr]="true"
        />
        <tz-textarea-field
          [control]="form.controls.note"
          [label]="'patient.note' | translate"
          [rows]="2"
        />
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <tz-button variant="text" (click)="ref.close()">{{
          'action.cancel' | translate
        }}</tz-button>
        <tz-button type="submit" [loading]="busy()">{{ 'action.save' | translate }}</tz-button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .fields {
      display: flex;
      flex-direction: column;
      gap: var(--tz-space-2);
      min-width: min(420px, 80vw);
      padding-top: var(--tz-space-2) !important;
    }
  `,
})
export class PatientDialog {
  protected readonly data = inject<PatientDialogData>(MAT_DIALOG_DATA);
  protected readonly ref = inject<MatDialogRef<PatientDialog, PatientSummary>>(MatDialogRef);
  private readonly api = inject(Api);
  private readonly notifier = inject(Notifier);

  protected readonly busy = signal(false);
  protected readonly form = new FormGroup({
    name: new FormControl(this.data.patient?.name ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    phone: new FormControl(this.data.patient?.phone ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(32)],
    }),
    note: new FormControl(this.data.patient?.note ?? '', { nonNullable: true }),
  });

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, phone, note } = this.form.getRawValue();
    const fields = { name, phone: phone || null, note: note || null };
    this.busy.set(true);
    const id = this.data.patient?.id;
    (id ? this.api.updatePatient(id, fields) : this.api.createPatient(fields)).subscribe({
      next: (patient) => {
        this.notifier.done('patient.saved');
        this.ref.close(patient);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.notifier.error(err);
      },
    });
  }
}
