import type {SupabaseMockPresets} from 'src/middleware/supabase-mock'

export const DEFAULT_SUPABASE_MOCK_PRESETS: SupabaseMockPresets = {
  signedIn: {
    mocks: {
      'auth.getUser': {
        user: {
          app_metadata: {provider: 'email', providers: ['email']},
          aud: 'authenticated',
          created_at: new Date(0).toISOString(),
          email: 'user@example.com',
          id: 'test-user-id',
          role: 'authenticated',
          updated_at: new Date(0).toISOString(),
          user_metadata: {},
        },
      },
    },
    mode: 'error',
  },
  signedOut: {
    mocks: {
      'auth.getUser': {user: null},
    },
    mode: 'error',
  },
}
