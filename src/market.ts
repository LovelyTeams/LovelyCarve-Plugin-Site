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
  releases: Release[];
}

const systems: Record<string, string> = { windows: 'Windows', linux: 'Linux', macos: 'macOS' };
const architectures: Record<string, string> = { x86_64: 'x64', aarch64: 'ARM64', x86: 'x86' };

export function platformLabel(platform: string): string {
  const separator = platform.lastIndexOf('-');
  const system = platform.slice(0, separator);
  const architecture = platform.slice(separator + 1);
  const os = Object.hasOwn(systems, system) ? systems[system] : undefined;
  return os ? `${os} ${architectures[architecture] ?? architecture}` : platform;
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

/** Read the native market index. Each action is derived from the release record. */
export function readMarket(value: unknown, indexUrl: URL): Plugin[] {
  const index = record(value);
  if (index.format !== 1) throw new Error('Unsupported market index');

  return list(index.packages).map(value => {
    const plugin = record(value);
    const locales = plugin.locales == null ? undefined : record(plugin.locales);
    const english = locales?.en == null ? undefined : record(locales.en);
    const releases = list(plugin.versions).map(value => {
      const release = record(value);
      const published = text(release.published);
      if (!Number.isFinite(Date.parse(published))) throw new Error('Invalid publication date');
      const artifacts = list(release.packages).map(value => {
        const artifact = record(value);
        const { size } = artifact;
        const sha256 = text(artifact.sha256);
        if (typeof size !== 'number' || !Number.isSafeInteger(size) || size <= 0 || !/^[a-f0-9]{64}$/.test(sha256)) {
          throw new Error('Invalid package size or checksum');
        }
        return { platform: text(artifact.platform), href: artifactHref(text(artifact.url), indexUrl), size, sha256 };
      });
      return { version: text(release.version), published, artifacts };
    });
    releases.sort((left, right) => Date.parse(right.published) - Date.parse(left.published));
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
