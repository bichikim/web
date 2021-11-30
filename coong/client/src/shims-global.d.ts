interface ImportMeta {
  env: {
    BASE_URL: string
    SSR?: boolean
    VITE_API_URL?: string
  }
}

declare const __DEV__: string | undefined
