/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="@solidjs/start/env" />
/// <reference types="vite/client" />
/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom/vitest" />

declare module '~icons/*' {
  const icon: any
  export default icon
}

declare module '*.json' {
  const value: object
  export default value
}

declare module '*.lottie' {
  const src: string
  export default src
}

import type {User, SupabaseClient} from '@supabase/supabase-js'

declare module '@solidjs/start/server' {
  interface RequestEventLocals {
    user?: User | null
    supabase?: SupabaseClient
  }
}
