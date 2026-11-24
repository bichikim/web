export interface ModelAsset {
  /** Relative path inside the supplied cache directory. */
  readonly path: string
  /** Exact expected file length in bytes. */
  readonly size: number
  /** Expected lowercase SHA-256 hex digest. */
  readonly sha256: string
}
export interface CacheOptions {
  /** OS platform; omitted uses the running process platform. */
  readonly platform?: string
  /** User home; omitted uses the OS home directory. */
  readonly home?: string
  /** OS cache environment; omitted reads the current process environment. */
  readonly environment?: Readonly<Record<string, string | undefined>>
}
export function cacheDirectory(identifier: string, options?: CacheOptions): string
export function prepareModelAsset(
  directory: string,
  file: ModelAsset,
  url: string,
  previous?: readonly string[],
): Promise<string>
