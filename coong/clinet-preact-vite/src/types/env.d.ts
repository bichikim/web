/// <reference types="vite/client" />
// noinspection JSFileReferences

interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

declare namespace NodeJS {
  interface ENV {
    VITE_API_URL: string
  }

  interface Process {
    env: ENV
  }
}
