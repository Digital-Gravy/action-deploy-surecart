export type DuplicateOutcome =
  | { kind: 'duplicate'; downloadId: string | null }
  | { kind: 'not-duplicate' };

const DUPLICATE_MESSAGES: ReadonlySet<string> = new Set([
  'Media has already been taken',
  'Url has already been taken',
]);

type ValidationError = { message?: string; download_id?: string };

export function detectDuplicate(responseBody: unknown): DuplicateOutcome {
  const body = responseBody as { validation_errors?: ValidationError[] };
  const firstErr = body.validation_errors?.[0];
  if (!firstErr?.message || !DUPLICATE_MESSAGES.has(firstErr.message)) {
    return { kind: 'not-duplicate' };
  }
  return { kind: 'duplicate', downloadId: firstErr.download_id ?? null };
}
