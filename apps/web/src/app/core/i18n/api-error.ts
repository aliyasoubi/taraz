import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

import type { ApiError } from '../models/api.model';

/** The `errors.<code>` key for whatever an API call failed with. */
export function errorKey(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'errors.network';
    const body = err.error as Partial<ApiError> | null;
    if (body && typeof body.code === 'string') return `errors.${body.code}`;
  }
  return 'errors.unknown';
}

/** Says what went wrong, in the user's words, in a snackbar. */
@Injectable({ providedIn: 'root' })
export class Notifier {
  private readonly snack = inject(MatSnackBar);
  private readonly i18n = inject(TranslateService);

  error(err: unknown): void {
    const key = errorKey(err);
    const message = this.i18n.instant(key);
    this.snack.open(message === key ? this.i18n.instant('errors.unknown') : message);
  }

  done(key: string, params?: Record<string, unknown>): void {
    this.snack.open(this.i18n.instant(key, params));
  }
}
