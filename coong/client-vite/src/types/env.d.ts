/// <reference types="vite/client" />
// noinspection JSFileReferences

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_OPTION_CACHE: string
  readonly VITE_SUPABASE_API: string
  readonly VITE_SUPABASE_URL: string
}

declare namespace NodeJS {
  interface ENV {
    VITE_API_URL: string
  }

  interface Process {
    env: ENV
  }
}
