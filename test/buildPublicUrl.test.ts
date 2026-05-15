import { buildPublicUrl } from '../src/lib/buildPublicUrl';

describe('buildPublicUrl', () => {
  it('joins base and key with a single slash', () => {
    expect(buildPublicUrl('https://dl.example.com', 'etch/a.zip')).toBe(
      'https://dl.example.com/etch/a.zip'
    );
  });

  it('strips trailing slash from base', () => {
    expect(buildPublicUrl('https://dl.example.com/', 'etch/a.zip')).toBe(
      'https://dl.example.com/etch/a.zip'
    );
  });

  it('strips leading slash from key', () => {
    expect(buildPublicUrl('https://dl.example.com', '/etch/a.zip')).toBe(
      'https://dl.example.com/etch/a.zip'
    );
  });

  it('strips both', () => {
    expect(buildPublicUrl('https://dl.example.com/', '/etch/a.zip')).toBe(
      'https://dl.example.com/etch/a.zip'
    );
  });
});
