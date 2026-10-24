declare module '@winter-love/unocss-config' {
  import type {VitePluginConfig} from '@unocss/vite'

  interface SharedUnoConfig extends VitePluginConfig {
    readonly shortcuts: Record<string, string | string[]>[]
  }
  const config: SharedUnoConfig
  export default config
}
