interface ImportMeta {
  env: {
    BASE_URL: string
    MODE?: string
    SSR?: boolean
  }
}

declare const __DEV__: string | undefined

type FC = import('solid')['Component']
