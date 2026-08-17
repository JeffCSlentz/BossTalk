// Ported from @rhyster/wow-casc-dbc (MIT)

function parseConfig(text: string): Record<string, string> {
  const entries: Record<string, string> = {};
  text.split(/\r?\n/)
    .filter(l => l.trim().length > 0 && !l.startsWith('#'))
    .forEach(l => {
      const m = /([^\s]+)\s?=\s?(.*)/.exec(l);
      if (!m) throw new Error(`Invalid config line: ${l}`);
      const key = m[1].split('-').map((p, i) => i === 0 ? p : p[0].toUpperCase() + p.slice(1)).join('');
      entries[key] = m[2];
    });
  return entries;
}

export interface BuildConfig {
  root: string;
  encoding: string;
  encodingSize: string;
  buildName: string;
  [key: string]: string;
}

export interface CDNConfig {
  archives: string;
  archivesIndexSize: string;
  [key: string]: string;
}

export function parseBuildConfig(text: string): BuildConfig {
  return parseConfig(text) as BuildConfig;
}

export function parseCDNConfig(text: string): CDNConfig {
  return parseConfig(text) as CDNConfig;
}

/** Parse .build.info — pipe-separated, first row is headers. Returns array of row objects. */
export function parseBuildInfo(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const headers = lines[0].split('|').map(h => h.split('!')[0]);
  return lines.slice(1).map(line => {
    const values = line.split('|');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
}
