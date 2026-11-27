// The system the visitor's browser runs on. A `lovelycarve://` link reaches
// the desktop app of that system only, so a release without a package for it
// cannot be installed from here. The architecture comes from client hints
// where the browser offers them; x64 builds also run emulated on ARM, so it
// only marks the matching package and never blocks an install.

/** The systems the market names packages for (`<system>-<architecture>`). */
export type SystemName = 'windows' | 'macos' | 'linux';

export interface Visitor {
  /** `mobile` has no desktop app; `null` is a system the page cannot tell. */
  system: SystemName | 'mobile' | null;
  /** Rust's architecture name (`x86_64`, `aarch64`), when the browser tells it. */
  architecture: string | null;
}

interface HighEntropyValues {
  architecture?: string;
  bitness?: string;
}

interface UserAgentData {
  platform?: string;
  mobile?: boolean;
  getHighEntropyValues?: (hints: string[]) => Promise<HighEntropyValues>;
}

/** The system from the client-hint platform, else the user agent string. */
export function systemFrom(userAgent: string, platform = '', touchPoints = 0): Visitor['system'] {
  switch (platform.toLowerCase()) {
    case 'windows': return 'windows';
    case 'macos': return 'macos';
    case 'linux': return 'linux';
    case 'android':
    case 'ios': return 'mobile';
    case 'chrome os':
    case 'chromium os': return null;
    default: break;
  }
  if (/Android|iPhone|iPad|iPod/i.test(userAgent)) return 'mobile';
  // iPadOS asks for desktop pages as a Mac; only its touch screen tells.
  if (/Macintosh|Mac OS X/i.test(userAgent)) return touchPoints > 1 ? 'mobile' : 'macos';
  if (/Windows/i.test(userAgent)) return 'windows';
  if (/CrOS/i.test(userAgent)) return null;
  if (/Linux|X11/i.test(userAgent)) return 'linux';
  return null;
}

/** Rust's architecture name from client hints (`x86` + `64` is `x86_64`). */
export function architectureFrom(architecture = '', bitness = ''): string | null {
  if (architecture === 'x86') return bitness === '64' ? 'x86_64' : 'x86';
  if (architecture === 'arm' && bitness === '64') return 'aarch64';
  return null;
}

function userAgentData(): UserAgentData | undefined {
  return (navigator as Navigator & { userAgentData?: UserAgentData }).userAgentData;
}

/** What the page can tell at once: the system only. */
export function currentVisitor(): Visitor {
  const data = userAgentData();
  const system = data?.mobile ? 'mobile' : systemFrom(navigator.userAgent, data?.platform, navigator.maxTouchPoints);
  return { system, architecture: null };
}

/** The visitor with the architecture, where the browser answers client hints. */
export async function detectVisitor(): Promise<Visitor> {
  const visitor = currentVisitor();
  const hints = userAgentData()?.getHighEntropyValues;
  if (!hints || visitor.system === null || visitor.system === 'mobile') return visitor;
  try {
    const values = await hints.call(userAgentData(), ['architecture', 'bitness']);
    return { ...visitor, architecture: architectureFrom(values.architecture, values.bitness) };
  } catch {
    return visitor;
  }
}
