import type { SystemName, Visitor } from './platform';
import { compareVersions, isPrerelease, isVersion } from './version';

/** The index LovelyCarve reads for install links from this page. */
export const officialIndex = 'https://lovelyteams.github.io/LovelyCarve-Plugin-Site/index.json';

export interface Artifact {
  platform: string;
  href: string;
  size: number;
  sha256: string;
}

export interface Release {
  version: string;
  published: string;
  prerelease: boolean;
  permissions: string[];
  artifacts: Artifact[];
}

export interface Plugin {
  id: string;
  name: string;
  description?: string;
  publisher?: string;
  license?: string;
  englishName?: string;
  englishDescription?: string;
  /** Highest version first. */
  releases: Release[];
}

/** Whether this browser can hand a release to LovelyCarve. */
export type Availability = 'available' | 'otherSystem' | 'desktopOnly';

const systems: Record<SystemName, string> = { windows: 'Windows', linux: 'Linux', macos: 'macOS' };
const architectures: Record<string, string> = { x86_64: 'x64', aarch64: 'ARM64', x86: 'x86' };

function isSystem(value: string): value is SystemName {
  return Object.hasOwn(systems, value);
}

/** `windows` of `windows-x86_64`. */
export function systemOf(platform: string): string {
  return platform.slice(0, Math.max(platform.lastIndexOf('-'), 0));
}

export function systemLabel(system: SystemName): string {
  return systems[system];
}

export function platformLabel(platform: string): string {
  const system = systemOf(platform);
  const architecture = platform.slice(system.length + 1);
  return isSystem(system) ? `${systems[system]} ${architectures[architecture] ?? architecture}` : platform;
}

export function installHref(id: string, version: string): string {
  return `lovelycarve://install-plugin?${new URLSearchParams({ id, version })}`;
}

export function formatSize(bytes: number, format: Intl.NumberFormat): string {
  if (bytes >= 1024 ** 3) return `${format.format(bytes / 1024 ** 3)} GiB`;
  if (bytes >= 1024 ** 2) return `${format.format(bytes / 1024 ** 2)} MiB`;
  if (bytes >= 1024) return `${format.format(bytes / 1024)} KiB`;
  return `${format.format(bytes)} B`;
}

/** The first and last eight digits; the full digest stays in the title and the copy. */
export function shortDigest(sha256: string): string {
  return `${sha256.slice(0, 8)}…${sha256.slice(-8)}`;
}

/** The day of an RFC 3339 time as written, as the desktop market shows it. */
export function publishedDay(published: string): string {
  return published.slice(0, 10);
}

/**
 * The version an install offers, as LovelyCarve picks it: the highest
 * release with a package for the visitor's system, else the highest
 * pre-release. Without a known system, or with no package for it, the
 * highest release of all.
 */
export function recommendedRelease(plugin: Plugin, system: Visitor['system']): Release {
  const forSystem = system && system !== 'mobile'
    ? plugin.releases.filter(release => release.artifacts.some(artifact => systemOf(artifact.platform) === system))
    : [];
  const pool = forSystem.length ? forSystem : plugin.releases;
  return pool.find(release => !release.prerelease) ?? pool[0];
}

export function availability(release: Release, visitor: Visitor): Availability {
  if (visitor.system === 'mobile') return 'desktopOnly';
  if (visitor.system && !release.artifacts.some(artifact => systemOf(artifact.platform) === visitor.system)) {
    return 'otherSystem';
  }
  return 'available';
}

/** The package this device would take: its exact platform, or the only one for its system. */
export function matchesDevice(artifact: Artifact, release: Release, visitor: Visitor): boolean {
  if (visitor.system === null || visitor.system === 'mobile') return false;
  if (visitor.architecture) return artifact.platform === `${visitor.system}-${visitor.architecture}`;
  const forSystem = release.artifacts.filter(candidate => systemOf(candidate.platform) === visitor.system);
  return forSystem.length === 1 && forSystem[0] === artifact;
}

/** This device's package first, then the rest of its system, then the others. */
export function orderedArtifacts(release: Release, visitor: Visitor): Artifact[] {
  const rank = (artifact: Artifact) => matchesDevice(artifact, release, visitor) ? 0
    : systemOf(artifact.platform) === visitor.system ? 1 : 2;
  return [...release.artifacts].sort((left, right) => rank(left) - rank(right));
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected a market index record');
  }
  return value as Record<string, unknown>;
}

function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Expected a market index list');
  return value;
}

function nonEmpty(value: unknown): unknown[] {
  const items = list(value);
  if (!items.length) throw new Error('Expected a non-empty market index list');
  return items;
}

function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Expected market index text');
  return value;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function artifactHref(value: string, indexUrl: URL): string {
  const url = new URL(value, indexUrl);
  const isHttps = /^https:\/\//i.test(value) && url.protocol === 'https:';
  const isRelative = !/^(?:[a-z][a-z\d+.-]*:|[\\/])/i.test(value) && !value.includes('\\');
  const directory = new URL('./', indexUrl);
  const insideMarket = url.origin === directory.origin && url.pathname.startsWith(directory.pathname);
  if (url.username || url.password || url.hash ||
    !(isHttps || (isRelative && insideMarket))) {
    throw new Error('Invalid plugin package URL');
  }
  return url.href;
}

/** Reads the market index the desktop reads (`format` 1); versions come highest first. */
export function readMarket(value: unknown, indexUrl: URL): Plugin[] {
  const index = record(value);
  if (index.format !== 1) throw new Error('Unsupported market index');

  return list(index.packages).map(value => {
    const plugin = record(value);
    const locales = plugin.locales == null ? undefined : record(plugin.locales);
    const english = locales?.en == null ? undefined : record(locales.en);
    const releases = nonEmpty(plugin.versions).map(value => {
      const release = record(value);
      const version = text(release.version);
      if (!isVersion(version)) throw new Error(`Invalid version ${version}`);
      const published = text(release.published);
      if (!Number.isFinite(Date.parse(published))) throw new Error('Invalid publication date');
      const permissions = release.permissions == null ? [] : list(release.permissions).map(text);
      const artifacts = nonEmpty(release.packages).map(value => {
        const artifact = record(value);
        const { size } = artifact;
        const sha256 = text(artifact.sha256);
        if (typeof size !== 'number' || !Number.isSafeInteger(size) || size <= 0 || !/^[a-f0-9]{64}$/.test(sha256)) {
          throw new Error('Invalid package size or checksum');
        }
        return { platform: text(artifact.platform), href: artifactHref(text(artifact.url), indexUrl), size, sha256 };
      });
      return { version, published, prerelease: isPrerelease(version), permissions, artifacts };
    });
    releases.sort((left, right) => compareVersions(right.version, left.version));
    return {
      id: text(plugin.id),
      name: text(plugin.name),
      description: optionalText(plugin.description),
      publisher: optionalText(plugin.publisher),
      license: optionalText(plugin.license),
      englishName: optionalText(english?.['plugin.name']),
      englishDescription: optionalText(english?.['plugin.description']),
      releases,
    };
  });
}
