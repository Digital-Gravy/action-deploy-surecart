import { detectDuplicate } from '../src/lib/duplicateErrorHandler';

describe('detectDuplicate', () => {
  it('returns not-duplicate when body is empty', () => {
    expect(detectDuplicate({})).toEqual({ kind: 'not-duplicate' });
  });

  it('returns duplicate with existing download_id when error is "Media has already been taken"', () => {
    const body = {
      validation_errors: [
        { message: 'Media has already been taken', download_id: 'dl_abc123' },
      ],
    };
    expect(detectDuplicate(body)).toEqual({ kind: 'duplicate', downloadId: 'dl_abc123' });
  });

  it('returns duplicate when error is "Url has already been taken"', () => {
    const body = {
      validation_errors: [
        { message: 'Url has already been taken', download_id: 'dl_xyz789' },
      ],
    };
    expect(detectDuplicate(body)).toEqual({ kind: 'duplicate', downloadId: 'dl_xyz789' });
  });

  it('returns duplicate with null downloadId when error is duplicate but download_id is missing', () => {
    const body = {
      validation_errors: [{ message: 'Media has already been taken' }],
    };
    expect(detectDuplicate(body)).toEqual({ kind: 'duplicate', downloadId: null });
  });

  it('returns not-duplicate when validation_errors has a non-duplicate message', () => {
    const body = {
      validation_errors: [{ message: "Url can't be blank" }],
    };
    expect(detectDuplicate(body)).toEqual({ kind: 'not-duplicate' });
  });

  it('returns not-duplicate when validation_errors is missing', () => {
    expect(detectDuplicate({ message: 'something else' })).toEqual({ kind: 'not-duplicate' });
  });

  it('returns not-duplicate when validation_errors is empty', () => {
    expect(detectDuplicate({ validation_errors: [] })).toEqual({ kind: 'not-duplicate' });
  });
});
