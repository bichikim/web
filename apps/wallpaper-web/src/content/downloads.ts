const RELEASE_ORIGIN = 'https://wallpaper-files.pomofi.io'
const LATEST_RELEASE = `${RELEASE_ORIGIN}/releases/latest.json`

const BYTES_PER_MEGABYTE = 1_000_000
const TARGETS = [
  {extension: 'dmg', id: 'macos-arm64', platform: 'macOS · Apple Silicon'},
  {extension: 'dmg', id: 'macos-x64', platform: 'macOS · Intel'},
  {extension: 'exe', id: 'windows-x64', platform: 'Windows · 64비트'},
] as const

interface Download {
  readonly platform: string
  readonly href: string
  readonly megabytes: number
}

export interface ReleaseDownloads {
  readonly isBeta: boolean
  readonly version: string
  readonly files: readonly Download[]
}

export const parseReleaseDownloads = (data: unknown): ReleaseDownloads | null => {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('version' in data) ||
    typeof data.version !== 'string' ||
    !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/u.test(data.version) ||
    !('build' in data) ||
    typeof data.build !== 'string' ||
    !/^\d+-\d+$/u.test(data.build) ||
    !('sizes' in data) ||
    typeof data.sizes !== 'object' ||
    data.sizes === null
  ) {
    return null
  }

  const files: Download[] = []
  const sizes: Readonly<Record<string, unknown>> = {...data.sizes}
  for (const target of TARGETS) {
    const bytes = sizes[target.id]
    if (typeof bytes !== 'number' || !Number.isSafeInteger(bytes) || bytes <= 0) {
      return null
    }
    files.push({
      href: `${RELEASE_ORIGIN}/releases/${data.version}/${data.build}/${target.id}.${target.extension}`,
      megabytes: Math.round(bytes / BYTES_PER_MEGABYTE),
      platform: target.platform,
    })
  }
  return {files, isBeta: 'channel' in data && data.channel === 'beta', version: data.version}
}

export const fetchReleaseDownloads = async (): Promise<ReleaseDownloads | null> => {
  try {
    const response = await fetch(LATEST_RELEASE)
    return response.ok ? parseReleaseDownloads(await response.json()) : null
  } catch {
    return null
  }
}
