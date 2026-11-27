import { expect, test } from 'bun:test';
import { compareVersions, isPrerelease, isVersion } from './version';

test('orders pre-releases by the semantic-version rules', () => {
  // The precedence example of the specification, shuffled.
  const ordered = [
    '1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0',
  ];
  const shuffled = [ordered[5], ordered[7], ordered[0], ordered[3], ordered[6], ordered[2], ordered[4], ordered[1]];
  expect(shuffled.sort(compareVersions)).toEqual(ordered);
  expect(compareVersions('1.10.0', '1.9.9')).toBe(1);
  expect(compareVersions('2.0.0', '10.0.0')).toBe(-1);
  expect(compareVersions('18446744073709551616.0.0', '18446744073709551615.0.0')).toBe(1);
});

test('breaks ties on build metadata as the Rust semver crate does', () => {
  expect(compareVersions('1.0.0+build.2', '1.0.0+build.10')).toBe(-1);
  expect(compareVersions('1.0.0', '1.0.0+build')).toBe(-1);
  expect(compareVersions('1.0.0+01', '1.0.0+1')).toBe(1);
  expect(compareVersions('1.0.0+1', '1.0.0+a')).toBe(-1);
  expect(compareVersions('1.0.0+same', '1.0.0+same')).toBe(0);
});

test('accepts only semantic versions', () => {
  for (const valid of ['0.0.0', '1.2.3-rc.1+build.5', '2.0.1-rc.1+build']) expect(isVersion(valid)).toBe(true);
  for (const invalid of ['1.0', 'v1.0.0', '01.0.0', '1.0.0-01', '1.0.0-', 'latest']) expect(isVersion(invalid)).toBe(false);
  expect(isPrerelease('2.0.0-rc.1')).toBe(true);
  expect(isPrerelease('2.0.0+build')).toBe(false);
  expect(() => compareVersions('latest', '1.0.0')).toThrow('Invalid version');
});
