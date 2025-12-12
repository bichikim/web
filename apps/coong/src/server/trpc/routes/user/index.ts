import {procedure, router} from 'src/server/trpc/init'
import {db} from 'src/server/db'
import {userRoles} from 'src/server/db/schema/user-roles'
import {eq, and} from 'drizzle-orm'
import {z} from 'zod'
import {getSupabaseClientKeys} from 'src/env/self'
import {createClient} from '@supabase/supabase-js'
import {createSupabase} from 'src/utils/supabase'

/**
 * Check if current user has admin role
 */
const checkAdminRole = async (userId: string): Promise<boolean> => {
  const adminRole = await db
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.ownerId, userId), eq(userRoles.role, '$admin')))
    .limit(1)

  return adminRole.length > 0
}

/**
 * Get current user from request
 */
const getCurrentUser = async () => {
  const supabase = createSupabase()

  const {
    data: {user},
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  return user
}

export const userRouter = router({
  getUser: procedure.query(() => {
    return 'Hello, world!'
  }),

  /**
   * Update user metadata (requires admin role or self-update)
   * Note: Certain fields like 'role' can only be updated by admins
   */
  updateUserMetadata: procedure
    .input(
      z.object({
        metadata: z.record(z.string(), z.unknown()),
        userId: z.string(),
      }),
    )
    .mutation(async ({input}) => {
      const currentUser = await getCurrentUser()
      const isAdmin = await checkAdminRole(currentUser.id)

      // Protected fields that only admins can update
      const PROTECTED_FIELDS = ['role']

      // Check if trying to update protected fields
      const updatingProtectedFields = Object.keys(input.metadata).some((key) => PROTECTED_FIELDS.includes(key))

      if (updatingProtectedFields && !isAdmin) {
        throw new Error('Forbidden: Only admins can update protected fields like role')
      }

      // Allow if: 1) updating own metadata (non-protected), or 2) user is admin
      if (input.userId !== currentUser.id && !isAdmin) {
        throw new Error('Forbidden: Admin role required to update other users')
      }

      // Get service_role key for admin operations
      const {url} = getSupabaseClientKeys()
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
      }

      // Use service_role client for admin operations
      const supabaseAdmin = createClient(url, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      const {data, error} = await supabaseAdmin.auth.admin.updateUserById(input.userId, {
        user_metadata: input.metadata,
      })

      if (error) {
        throw error
      }

      return data.user
    }),
})
