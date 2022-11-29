/// <reference types="vite/client" />
// noinspection JSFileReferences

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_PRIMARY_COLOR: string
  readonly VITE_WEB_VITALS: string
}

declare namespace NodeJS {
  interface ENV {
    VITE_API_URL: string
  }

  interface Process {
    env: ENV
  }
}
