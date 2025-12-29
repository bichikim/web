import {createMiddleware} from '@solidjs/start/middleware'
import {mergeMiddleware} from 'src/utils/middleware-helper'
import {cspMiddleware} from 'src/middleware/csp'
import {csrfMiddleware} from 'src/middleware/csrf'
import {createSupabaseMockMiddleware} from 'src/middleware/supabase-mock'
import {DEFAULT_SUPABASE_MOCK_PRESETS} from 'src/middleware/supabase-mock.presets'

export default createMiddleware(
  // merge middleware
  mergeMiddleware(
    // supabase mock middleware
    createSupabaseMockMiddleware(DEFAULT_SUPABASE_MOCK_PRESETS),
    // csp middleware
    cspMiddleware,
    // csrf middleware
    csrfMiddleware,
  ),
)
