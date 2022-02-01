interface ImportMeta {
  env: {
    BASE_URL: string
    MODE?: string
    SSR?: boolean
    VITE_API_URL?: string
    VITE_STATIC_URL?: string
  }
}

declare const __DEV__: string | undefined

interface Window {
  solana?: any
  solflare?: {
    isSolflare: boolean
  }
}
