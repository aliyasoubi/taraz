/**
 * Errors leave the API as stable codes, never sentences: the web app owns the
 * wording (`errors.<code>` in its locale file).
 */
export type ErrorCode =
  | 'invalid_credentials'
  | 'unauthorized'
  | 'wrong_password'
  | 'patient_not_found'
  | 'entry_not_found'
  | 'payment_not_found'
  | 'doctor_not_found'
  | 'account_not_found'
  | 'patient_required'
  | 'nothing_owed'
  | 'no_deposit'
  | 'doctor_name_taken'
  | 'account_title_taken'
  | 'invalid_month'
  | 'validation_failed'
  | 'internal_error';

export type ErrorParams = Record<string, string | number>;

export class DomainError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly params: ErrorParams = {},
  ) {
    super(code);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** A requested record does not exist. → 404 */
export class NotFoundError extends DomainError {}

/** The request is well-formed but breaks a rule. → 400 */
export class InvalidInputError extends DomainError {}

/** The change would break a uniqueness or state rule. → 409 */
export class ConflictError extends DomainError {}
