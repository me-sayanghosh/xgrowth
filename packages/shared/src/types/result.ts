export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E = Error> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

export class UnsupportedCapabilityError extends Error {
  readonly code = 'UNSUPPORTED_CAPABILITY';
  constructor(
    public readonly capability: string,
    public readonly provider: string,
    message?: string,
  ) {
    super(message || `Capability '${capability}' is not supported by provider '${provider}'.`);
    this.name = 'UnsupportedCapabilityError';
  }
}
