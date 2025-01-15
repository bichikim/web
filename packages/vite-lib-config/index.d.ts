export const createConfig: (payload?: {
  root?: string
  packageJson?: Record<string, unknown>
  external?: string[]
  entry?: Record<string, string>
  alias?: Record<string, string>
  target?: 'modules' | string
  plugins?: import('vite').Plugin[]
  rollupOutputPlugins?: import('rollup').OutputPluginOption[]
}) => import('vite')['UserConfig']

export const targets: string
