export const createConfig: (payload?: {
  root?: string
  packageJson?: Record<string, unknown>
  external?: string[]
  entry?: Record<string, string>
  alias?: Record<string, string>
  target?: 'modules' | string
  solid?: Partial<import('vite-plugin-solid').Options>
  plugins?: import('vite').Plugin[]
  rollupOutputPlugins?: import('rollup').OutputPluginOption[]
}) => import('vite').UserConfigFnObject

export const targets: string
