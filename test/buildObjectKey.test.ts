import { buildObjectKey } from '../src/lib/buildObjectKey';

describe('buildObjectKey', () => {
  it('joins prefix, asset basename, sha, and original extension', () => {
    expect(buildObjectKey('etch', 'etch-1.4.18.zip', 'abc123def456')).toBe(
      'etch/etch-1.4.18-abc123def456.zip'
    );
  });

  it('preserves multi-dot basenames', () => {
    expect(buildObjectKey('releases', 'plugin-2.0.0-beta.zip', 'aaaaaaaaaaaaaaaa')).toBe(
      'releases/plugin-2.0.0-beta-aaaaaaaaaaaaaaaa.zip'
    );
  });

  it('preserves non-zip extensions', () => {
    expect(buildObjectKey('etch', 'asset.tar.gz', 'ffffffffffffffff')).toBe(
      'etch/asset.tar-ffffffffffffffff.gz'
    );
  });

  it('strips leading and trailing slashes from prefix', () => {
    expect(buildObjectKey('/etch/', 'a.zip', 'abc')).toBe('etch/a-abc.zip');
  });

  it('handles empty prefix', () => {
    expect(buildObjectKey('', 'a.zip', 'abc')).toBe('/a-abc.zip');
  });
});
