import { expect, test } from 'bun:test';
import { installHref, officialIndex, platformLabel, readMarket } from './market';

const indexUrl = new URL(officialIndex);
const sha256 = 'b'.repeat(64);

function market(url = 'files/plugin.lcpkg') {
  return {
    format: 1,
    packages: [{
      id: 'org.example.plugin',
      name: '示例插件',
      locales: { en: { 'plugin.name': 'Demo plugin' } },
      versions: [
        { version: '1.0.0', published: '2026-11-20T08:00:00Z', packages: [{ platform: 'linux-aarch64', url, size: 1024, sha256 }] },
        { version: '1.1.0+build.1', published: '2026-11-25T08:00:00Z', packages: [{ platform: 'windows-x86_64', url, size: 2048, sha256 }] },
      ],
    }],
  };
}

test('keeps translated names, release order and project-site download paths', () => {
  const [plugin] = readMarket(market(), indexUrl);
  expect(plugin.englishName).toBe('Demo plugin');
  expect(plugin.releases.map(release => release.version)).toEqual(['1.1.0+build.1', '1.0.0']);
  expect(plugin.releases[0].artifacts[0].href).toBe(new URL('files/plugin.lcpkg', indexUrl).href);
  expect(plugin.releases[0].artifacts[0].sha256).toBe(sha256);
  expect(platformLabel(plugin.releases[0].artifacts[0].platform)).toBe('Windows x64');
});

test('the desktop link contains only the selected ID and exact version', () => {
  const href = new URL(installHref('org.example.plugin', '1.1.0+build.1'));
  expect(href.protocol).toBe('lovelycarve:');
  expect(href.hostname).toBe('install-plugin');
  expect([...href.searchParams]).toEqual([['id', 'org.example.plugin'], ['version', '1.1.0+build.1']]);
});

test('accepts HTTPS package mirrors and rejects invalid download destinations', () => {
  const mirror = 'https://downloads.example.com/plugin.lcpkg';
  expect(readMarket(market(mirror), indexUrl)[0].releases[0].artifacts[0].href).toBe(mirror);
  for (const url of [
    '../plugin.lcpkg',
    '//downloads.example.com/plugin.lcpkg',
    'http://downloads.example.com/plugin.lcpkg',
    'javascript:alert(1)',
    'https://user@downloads.example.com/plugin.lcpkg',
    'plugin.lcpkg#section',
  ]) expect(() => readMarket(market(url), indexUrl)).toThrow('Invalid plugin package URL');
});

test('rejects invalid market records', () => {
  expect(() => readMarket({ format: 2, packages: [] }, indexUrl)).toThrow('Unsupported market index');
  expect(() => readMarket({ format: 1, packages: [null] }, indexUrl)).toThrow();
});
