export const createConfig: (payload?: {
  root?: string
  packageJson?: Record<string, unknown>
  external?: string[]
  entry?: Record<string, string>
  alias?: Record<string, string>
}) => import('vite')['UserConfig']
