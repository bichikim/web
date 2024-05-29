export const createConfig: (payload?: {
  root?: string
  packageJson?: Record<string, unknown>
  isProduction?: boolean
}) => import('vite')['UserConfig']
