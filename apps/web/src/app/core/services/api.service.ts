import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  Account,
  Doctor,
  Entry,
  EntryInput,
  JalaliMonth,
  MonthReport,
  PatientDetail,
  PatientPage,
  PatientSummary,
  PaymentInput,
} from '../models/api.model';

export interface PatientQuery {
  q?: string;
  status?: 'all' | 'debtor' | 'creditor' | 'settled';
  sort?: 'recent' | 'name' | 'balance';
  page?: number;
  limit?: number;
}

export interface PatientFields {
  name?: string;
  phone?: string | null;
  note?: string | null;
}

function params(values: object): HttpParams {
  let p = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') p = p.set(key, String(value));
  }
  return p;
}

/** Every call the web app makes. The session rides in an httpOnly cookie. */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  patients(query: PatientQuery): Observable<PatientPage> {
    return this.http.get<PatientPage>(`${this.base}/patients`, { params: params(query) });
  }

  patient(id: string): Observable<PatientDetail> {
    return this.http.get<PatientDetail>(`${this.base}/patients/${id}`);
  }

  createPatient(fields: PatientFields): Observable<PatientSummary> {
    return this.http.post<PatientSummary>(`${this.base}/patients`, fields);
  }

  updatePatient(id: string, fields: PatientFields): Observable<PatientSummary> {
    return this.http.patch<PatientSummary>(`${this.base}/patients/${id}`, fields);
  }

  deletePatient(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/patients/${id}`);
  }

  entry(id: string): Observable<Entry> {
    return this.http.get<Entry>(`${this.base}/entries/${id}`);
  }

  createEntry(input: EntryInput): Observable<Entry> {
    return this.http.post<Entry>(`${this.base}/entries`, input);
  }

  updateEntry(id: string, input: Partial<EntryInput>): Observable<Entry> {
    return this.http.patch<Entry>(`${this.base}/entries/${id}`, input);
  }

  deleteEntry(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/entries/${id}`);
  }

  addPayment(entryId: string, input: PaymentInput): Observable<Entry> {
    return this.http.post<Entry>(`${this.base}/entries/${entryId}/payments`, input);
  }

  /** Moves the patient's deposits onto what is still owed on the entry. */
  applyDeposits(entryId: string): Observable<Entry> {
    return this.http.post<Entry>(`${this.base}/entries/${entryId}/apply-deposits`, {});
  }

  updatePayment(id: string, input: Partial<PaymentInput>): Observable<Entry> {
    return this.http.patch<Entry>(`${this.base}/payments/${id}`, input);
  }

  deletePayment(id: string): Observable<Entry> {
    return this.http.delete<Entry>(`${this.base}/payments/${id}`);
  }

  doctors(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(`${this.base}/doctors`);
  }

  saveDoctor(id: string | null, fields: Partial<Doctor>): Observable<Doctor> {
    return id
      ? this.http.patch<Doctor>(`${this.base}/doctors/${id}`, fields)
      : this.http.post<Doctor>(`${this.base}/doctors`, fields);
  }

  accounts(): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.base}/accounts`);
  }

  saveAccount(id: string | null, fields: Partial<Account>): Observable<Account> {
    return id
      ? this.http.patch<Account>(`${this.base}/accounts/${id}`, fields)
      : this.http.post<Account>(`${this.base}/accounts`, fields);
  }

  month(month: JalaliMonth): Observable<MonthReport> {
    return this.http.get<MonthReport>(`${this.base}/reports/month`, { params: params(month) });
  }

  months(): Observable<JalaliMonth[]> {
    return this.http.get<JalaliMonth[]>(`${this.base}/reports/months`);
  }

  monthWorkbook(month: JalaliMonth): Observable<Blob> {
    return this.http.get(`${this.base}/reports/month/export`, {
      params: params(month),
      responseType: 'blob',
    });
  }
}
