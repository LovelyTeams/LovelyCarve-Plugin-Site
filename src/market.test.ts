import { expect, test } from 'bun:test';
import {
  availability,
  installHref,
  matchesDevice,
  officialIndex,
  orderedArtifacts,
  platformLabel,
  readMarket,
  recommendedRelease,
  shortDigest,
  type Plugin,
} from './market';
import type { Visitor } from './platform';

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
        {
          version: '1.10.0+build.1',
          published: '2026-11-18T08:00:00Z',
          permissions: ['file_materialize'],
          packages: [{ platform: 'windows-x86_64', url, size: 2048, sha256 }],
        },
        { version: '1.2.0', published: '2026-11-25T08:00:00Z', packages: [{ platform: 'windows-x86_64', url, size: 2048, sha256 }] },
      ],
    }],
  };
}

/** Versions offered on `platforms`, as the desktop's catalog test lists them. */
function plugin(versions: [string, string[]][]): Plugin {
  return readMarket({
    format: 1,
    packages: [{
      id: 'org.example.demo',
      name: '示例',
      versions: versions.map(([version, platforms]) => ({
        version,
        published: '2026-11-25T08:00:00Z',
        packages: platforms.map(platform => ({ platform, url: `demo-${version}-${platform}.lcpkg`, size: 10, sha256 })),
      })),
    }],
  }, indexUrl)[0];
}

const visitor = (system: Visitor['system'], architecture: string | null = null): Visitor => ({ system, architecture });

test('keeps translated names, orders versions as semantic versions and resolves downloads on the site', () => {
  const [entry] = readMarket(market(), indexUrl);
  expect(entry.englishName).toBe('Demo plugin');
  expect(entry.releases.map(release => release.version)).toEqual(['1.10.0+build.1', '1.2.0', '1.0.0']);
  expect(entry.releases[0].artifacts[0].href).toBe(new URL('files/plugin.lcpkg', indexUrl).href);
  expect(entry.releases[0].permissions).toEqual(['file_materialize']);
  expect(entry.releases[1].permissions).toEqual([]);
  expect(platformLabel(entry.releases[0].artifacts[0].platform)).toBe('Windows x64');
  expect(platformLabel('linux-aarch64')).toBe('Linux ARM64');
  expect(shortDigest('0123456789abcdef'.repeat(4))).toBe('01234567…89abcdef');
});

test('the desktop link contains only the selected ID and exact version', () => {
  const href = new URL(installHref('org.example.plugin', '1.1.0+build.1'));
  expect(href.protocol).toBe('lovelycarve:');
  expect(href.hostname).toBe('install-plugin');
  expect([...href.searchParams]).toEqual([['id', 'org.example.plugin'], ['version', '1.1.0+build.1']]);
});

test('offers the version the desktop installs: the highest release with a package for the system', () => {
  const offered = plugin([
    ['1.0.0', ['windows-x86_64']],
    ['1.1.0', ['windows-x86_64', 'linux-x86_64']],
    ['1.2.0', ['linux-x86_64']],
    ['2.0.0-rc.1', ['windows-x86_64']],
  ]);
  expect(offered.releases.map(release => [release.version, release.prerelease])).toEqual([
    ['2.0.0-rc.1', true], ['1.2.0', false], ['1.1.0', false], ['1.0.0', false],
  ]);
  expect(recommendedRelease(offered, 'windows').version).toBe('1.1.0');
  expect(recommendedRelease(offered, 'linux').version).toBe('1.2.0');
  // Unknown or without a package: the highest release of all.
  expect(recommendedRelease(offered, null).version).toBe('1.2.0');
  expect(recommendedRelease(offered, 'macos').version).toBe('1.2.0');
  expect(recommendedRelease(offered, 'mobile').version).toBe('1.2.0');
  // Only a pre-release.
  expect(recommendedRelease(plugin([['2.0.0-rc.1', ['windows-x86_64']]]), 'windows').version).toBe('2.0.0-rc.1');
});

test('a link reaches the desktop of the browser system only', () => {
  const release = plugin([['1.0.0', ['windows-x86_64', 'windows-aarch64']]]).releases[0];
  expect(availability(release, visitor('windows'))).toBe('available');
  expect(availability(release, visitor(null))).toBe('available');
  expect(availability(release, visitor('macos'))).toBe('otherSystem');
  expect(availability(release, visitor('mobile'))).toBe('desktopOnly');
});

test('marks the package of this device and lists it first', () => {
  const release = plugin([['1.0.0', ['linux-x86_64', 'windows-x86_64', 'windows-aarch64']]]).releases[0];
  const order = (seen: Visitor) => orderedArtifacts(release, seen).map(artifact => artifact.platform);
  expect(order(visitor('windows', 'aarch64'))).toEqual(['windows-aarch64', 'windows-x86_64', 'linux-x86_64']);
  expect(order(visitor(null))).toEqual(['linux-x86_64', 'windows-x86_64', 'windows-aarch64']);
  const [linux, windows] = release.artifacts;
  expect(matchesDevice(windows, release, visitor('windows', 'x86_64'))).toBe(true);
  // Two Windows packages and no architecture: neither is certain.
  expect(matchesDevice(windows, release, visitor('windows'))).toBe(false);
  // The only Linux package.
  expect(matchesDevice(linux, release, visitor('linux'))).toBe(true);
  expect(matchesDevice(linux, release, visitor('mobile'))).toBe(false);
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
  expect(() => plugin([['v1.0.0', ['windows-x86_64']]])).toThrow('Invalid version');
  expect(() => plugin([['1.0.0', []]])).toThrow();
  expect(() => plugin([])).toThrow();
});
