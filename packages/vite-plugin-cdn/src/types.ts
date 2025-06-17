import type {ResolvedConfig} from 'vite'

export interface CdnDevelopmentOptions {
  overrideHeaders?: OverrideHeaders
}

export interface CdnOptions {
  dev?: CdnDevelopmentOptions
  /**
   * Prefix for identifying CDN sources
   * Also serves as the final build output directory location
   * @default /_cdn/
   */
  prefix?: string
  /**
   * Prevent cleaning up the build output directory on closeBundle
   * @default false
   */
  preventCleanUpOnCloseBundle?: boolean
  /**
   * @default public
   */
  publicPath?: string
  root?: string

  /**
   * cdn source map
   * Warning: Sources not mapped here will not be included in the build
   */
  sourceMap?: Record<string, string>

  /**
   * If defined, it will be called before the build starts, and if the condition is not met, the build will not start
   * @param config
   * @returns
   */
  workOn?: (config: ResolvedConfig) => boolean
}

/**
 * @returns null if the url is not a cdn url
 */
export type URLMapper = (url: string, prefix?: string) => string | null

export interface Module {
  headers: Record<string, string[]>
  text: string
}

export type OverrideHeaders = (
  url: string,
  headers: Record<string, string | string[]>,
) => Record<string, string | string[]>
