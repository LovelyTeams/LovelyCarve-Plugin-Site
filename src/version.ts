// Semantic versions as LovelyCarve orders them: the Rust `semver` crate's
// precedence (major, minor, patch, then pre-release, with build metadata as
// the last tie-break), so the page offers the version the desktop would.

const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

interface Parsed {
  core: [string, string, string];
  pre: string[];
  build: string[];
}

function parse(text: string): Parsed | null {
  const match = SEMVER.exec(text);
  if (!match) return null;
  return {
    core: [match[1], match[2], match[3]],
    pre: match[4] ? match[4].split('.') : [],
    build: match[5] ? match[5].split('.') : [],
  };
}

function sign(value: number): -1 | 0 | 1 {
  return value < 0 ? -1 : value > 0 ? 1 : 0;
}

function lexical(left: string, right: string): -1 | 0 | 1 {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Digit strings without leading zeros compare by length, then by digits. */
function numeric(left: string, right: string): -1 | 0 | 1 {
  return sign(left.length - right.length) || lexical(left, right);
}

const digits = (text: string) => /^\d+$/.test(text);

/** Identifier lists: numeric below alphanumeric, a longer list above its prefix. */
function identifiers(left: string[], right: string[], compareNumbers: (left: string, right: string) => -1 | 0 | 1): -1 | 0 | 1 {
  for (let index = 0; index < left.length; index += 1) {
    if (index >= right.length) return 1;
    const [a, b] = [left[index], right[index]];
    const order = digits(a) && digits(b) ? compareNumbers(a, b)
      : digits(a) ? -1
        : digits(b) ? 1
          : lexical(a, b);
    if (order) return order;
  }
  return left.length < right.length ? -1 : 0;
}

/** Build metadata may carry leading zeros: 0 < 00 < 1 < 01 < 2 < 10. */
function buildNumber(left: string, right: string): -1 | 0 | 1 {
  const [a, b] = [left.replace(/^0+/, ''), right.replace(/^0+/, '')];
  return numeric(a, b) || sign(left.length - right.length);
}

export function isVersion(text: string): boolean {
  return parse(text) !== null;
}

export function isPrerelease(text: string): boolean {
  return (parse(text)?.pre.length ?? 0) > 0;
}

/** The order of two valid versions; throws on anything else. */
export function compareVersions(left: string, right: string): -1 | 0 | 1 {
  const [a, b] = [parse(left), parse(right)];
  if (!a || !b) throw new Error('Invalid version');
  for (let index = 0; index < 3; index += 1) {
    const order = numeric(a.core[index], b.core[index]);
    if (order) return order;
  }
  if (!a.pre.length || !b.pre.length) {
    // A release sits above its pre-releases.
    const order = sign(b.pre.length - a.pre.length);
    if (order) return order;
  } else {
    const order = identifiers(a.pre, b.pre, numeric);
    if (order) return order;
  }
  return identifiers(a.build, b.build, buildNumber);
}
