import { buildObjectKey } from '../src/lib/buildObjectKey';

describe('buildObjectKey', () => {
  it('uses sha as a directory segment so the filename keeps the original asset name', () => {
    expect(buildObjectKey('etch', 'etch-1.4.18.zip', 'abc123def456')).toBe(
      'etch/abc123def456/etch-1.4.18.zip'
    );
  });

  it('preserves multi-dot asset names verbatim', () => {
    expect(buildObjectKey('releases', 'plugin-2.0.0-beta.zip', 'aaaaaaaaaaaaaaaa')).toBe(
      'releases/aaaaaaaaaaaaaaaa/plugin-2.0.0-beta.zip'
    );
  });

  it('preserves non-zip extensions', () => {
    expect(buildObjectKey('etch', 'asset.tar.gz', 'ffffffffffffffff')).toBe(
      'etch/ffffffffffffffff/asset.tar.gz'
    );
  });

  it('strips leading and trailing slashes from prefix', () => {
    expect(buildObjectKey('/etch/', 'a.zip', 'abc')).toBe('etch/abc/a.zip');
  });

  it('handles empty prefix', () => {
    expect(buildObjectKey('', 'a.zip', 'abc')).toBe('/abc/a.zip');
  });
});
