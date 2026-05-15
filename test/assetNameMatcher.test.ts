import { matchesGlob } from '../src/lib/assetNameMatcher';

describe('matchesGlob', () => {
  it('matches everything when pattern is empty', () => {
    expect(matchesGlob('etch-1.4.18.zip', '')).toBe(true);
  });

  it('matches with * wildcard', () => {
    expect(matchesGlob('etch-1.4.18.zip', '*.zip')).toBe(true);
    expect(matchesGlob('etch-theme-0.0.7.zip', '*.zip')).toBe(true);
  });

  it('matches with prefix wildcard', () => {
    expect(matchesGlob('etch-1.4.18.zip', 'etch*.zip')).toBe(true);
    expect(matchesGlob('etch-theme-0.0.7.zip', 'etch*.zip')).toBe(true);
    expect(matchesGlob('other-1.0.zip', 'etch*.zip')).toBe(false);
  });

  it('matches with character class', () => {
    expect(matchesGlob('etch-1.4.18.zip', 'etch-[0-9]*.zip')).toBe(true);
    expect(matchesGlob('etch-theme-0.0.7.zip', 'etch-[0-9]*.zip')).toBe(false);
  });

  it('rejects non-matching names', () => {
    expect(matchesGlob('source.tar.gz', '*.zip')).toBe(false);
  });

  it('escapes literal regex metachars in the pattern', () => {
    expect(matchesGlob('a.b.zip', 'a.b.zip')).toBe(true);
    expect(matchesGlob('aXbXzip', 'a.b.zip')).toBe(false);
  });
});
