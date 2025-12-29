import type {SupabaseClient, User} from '@supabase/supabase-js'
import {createMiddlewareFragment} from 'src/utils/middleware-helper'

interface SupabaseMockError {
  message: string
  status?: number
}

interface SupabaseMockResult<TData> {
  data: TData
  error: SupabaseMockError | null
}

interface SupabaseMockSpec {
  /**
   * Mock key → return payload.
   * - For auth.* methods, store what should become `data` for that method.
   */
  mocks?: Record<string, unknown>
  /** When "error", missing mocks return an error object to fail fast in tests. */
  mode?: 'error' | 'bypass'
}

/**
 * Header name for Supabase mock configuration.
 *
 * Header Format:
 * The header value can be provided in two formats:
 *
 * 1. Preset reference:
 *    x-supabase-mock: preset:presetId
 *    Example: x-supabase-mock: preset:signedIn
 *
 * 2. Base64-encoded JSON spec:
 *    x-supabase-mock: <base64-encoded-json>
 *    The JSON should match SupabaseMockSpec interface:
 *    {
 *      "mocks": {
 *        "auth.getUser": { "user": {...} },
 *        "auth.signInWithPassword": { "session": {...}, "user": {...} },
 *        ...
 *      },
 *      "mode": "error" | "bypass"
 *    }
 *
 * Supported mock keys:
 * - auth.exchangeCodeForSession
 * - auth.getUser
 * - auth.resetPasswordForEmail
 * - auth.signInWithPassword
 * - auth.signOut
 * - auth.signUp
 * - auth.updateUser
 *
 * Note: Base64URL format (with - and _) is also supported and will be automatically converted.
 */
const HEADER_NAME = 'x-supabase-mock'

export interface SupabaseMockPresets {
  [presetId: string]: SupabaseMockSpec
}

const decodeBase64 = (value: string): string => {
  // Accept base64url too.
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')

  return Buffer.from(normalized, 'base64').toString('utf8')
}

/**
 * Parses the mock specification from the header value.
 *
 * Supports two formats:
 * 1. Preset reference: "preset:presetId" - looks up the preset from the presets object
 * 2. Base64-encoded JSON: decodes the base64 string and parses as JSON spec
 *
 * @param raw - Raw header value string
 * @param presets - Available preset configurations
 * @returns Parsed SupabaseMockSpec or null if parsing fails
 */
const parseSpecFromHeader = (raw: string, presets: SupabaseMockPresets): SupabaseMockSpec | null => {
  const value = raw.trim()

  if (!value) {
    return null
  }

  if (value.startsWith('preset:')) {
    const presetId = value.slice('preset:'.length).trim()

    return presets[presetId] ?? null
  }

  try {
    const jsonText = decodeBase64(value)
    const parsed = JSON.parse(jsonText) as unknown

    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    return parsed as SupabaseMockSpec
  } catch {
    return null
  }
}

const asError = (message: string, status?: number): SupabaseMockError => ({message, status})

const result = <TData>(data: TData, error: SupabaseMockError | null): SupabaseMockResult<TData> => ({
  data,
  error,
})

const getMock = (spec: SupabaseMockSpec, key: string): unknown => {
  const mocks = spec.mocks ?? {}

  return mocks[key]
}

const getMode = (spec: SupabaseMockSpec): 'error' | 'bypass' => spec.mode ?? 'error'

const missing = (spec: SupabaseMockSpec, key: string) => {
  const mode = getMode(spec)

  if (mode === 'bypass') {
    return null
  }

  return asError(`Missing supabase mock: ${key}`, 500)
}

const createMockSupabase = (spec: SupabaseMockSpec): SupabaseClient => {
  const auth = {
    exchangeCodeForSession: async (_code: string) => {
      const key = 'auth.exchangeCodeForSession'
      const mock = getMock(spec, key)

      if (mock === undefined) {
        return result({session: null, user: null} as any, missing(spec, key))
      }

      return result(mock as any, null)
    },
    getUser: async () => {
      const key = 'auth.getUser'
      const mock = getMock(spec, key)

      if (mock === undefined) {
        return result({user: null} as any, missing(spec, key))
      }

      return result(mock as any, null)
    },
    resetPasswordForEmail: async (_email: string, _options?: any) => {
      const key = 'auth.resetPasswordForEmail'
      const mock = getMock(spec, key)

      if (mock === undefined) {
        return result({} as any, missing(spec, key))
      }

      return result(mock as any, null)
    },
    signInWithPassword: async (_params: {email: string; password: string}) => {
      const key = 'auth.signInWithPassword'
      const mock = getMock(spec, key)

      if (mock === undefined) {
        return result({session: null, user: null} as any, missing(spec, key))
      }

      return result(mock as any, null)
    },
    signOut: async () => {
      const key = 'auth.signOut'
      const mock = getMock(spec, key)

      if (mock === undefined) {
        return {error: missing(spec, key)} as any
      }

      return {data: mock, error: null} as any
    },
    signUp: async (_params: any) => {
      const key = 'auth.signUp'
      const mock = getMock(spec, key)

      if (mock === undefined) {
        return result({session: null, user: null} as any, missing(spec, key))
      }

      return result(mock as any, null)
    },
    updateUser: async (_params: any) => {
      const key = 'auth.updateUser'
      const mock = getMock(spec, key)

      if (mock === undefined) {
        return result({user: null} as any, missing(spec, key))
      }

      return result(mock as any, null)
    },
  }

  // English comment: Return a minimal SupabaseClient shape; cast is intentional for testing.
  return {auth} as unknown as SupabaseClient
}

const maybeExtractUser = (spec: SupabaseMockSpec): User | null | undefined => {
  const data = getMock(spec, 'auth.getUser')

  if (!data || typeof data !== 'object') {
    return undefined
  }
  const user = (data as any).user

  return user as User | null | undefined
}

const isEnabled = (): boolean => {
  // Only allow this middleware in non-production and E2E runtime.
  return !import.meta.env.PROD && process.env.E2E === '1'
}

export const createSupabaseMockMiddleware = (presets: SupabaseMockPresets) =>
  createMiddlewareFragment({
    onRequest: async (event) => {
      if (!isEnabled()) {
        return
      }

      // Get the header value from the request.
      const headerValue = event.request.headers.get(HEADER_NAME)

      if (!headerValue) {
        return
      }

      const spec = parseSpecFromHeader(headerValue, presets)

      if (!spec) {
        return
      }

      event.locals.supabase = createMockSupabase(spec)

      const user = maybeExtractUser(spec)

      if (user !== undefined) {
        event.locals.user = user
      }
    },
  })
