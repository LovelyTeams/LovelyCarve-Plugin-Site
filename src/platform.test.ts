import { expect, test } from 'bun:test';
import { architectureFrom, systemFrom } from './platform';

const agents = {
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  linux: 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  chromeOs: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
};

test('tells the system from the user agent', () => {
  expect(systemFrom(agents.windows)).toBe('windows');
  expect(systemFrom(agents.mac)).toBe('macos');
  expect(systemFrom(agents.linux)).toBe('linux');
  expect(systemFrom(agents.android)).toBe('mobile');
  expect(systemFrom(agents.iphone)).toBe('mobile');
  expect(systemFrom(agents.chromeOs)).toBeNull();
  // iPadOS asks for desktop pages as a Mac with a touch screen.
  expect(systemFrom(agents.mac, '', 5)).toBe('mobile');
  expect(systemFrom('')).toBeNull();
});

test('prefers the client-hint platform', () => {
  expect(systemFrom(agents.linux, 'Windows')).toBe('windows');
  expect(systemFrom(agents.windows, 'macOS')).toBe('macos');
  expect(systemFrom(agents.linux, 'Android')).toBe('mobile');
  expect(systemFrom(agents.chromeOs, 'Chrome OS')).toBeNull();
  expect(systemFrom(agents.windows, 'Unknown')).toBe('windows');
});

test('names the architecture as Rust does', () => {
  expect(architectureFrom('x86', '64')).toBe('x86_64');
  expect(architectureFrom('x86', '32')).toBe('x86');
  expect(architectureFrom('arm', '64')).toBe('aarch64');
  expect(architectureFrom('arm', '32')).toBeNull();
  expect(architectureFrom()).toBeNull();
});
