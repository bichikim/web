import {type SolidAuthConfig} from '@auth/solid-start'
import GitHub from '@auth/core/providers/github'
import {DrizzleAdapter} from '@auth/drizzle-adapter'
import {db} from '../db'
import {
  accounts,
  authenticators,
  sessions,
  users,
  verificationTokens,
} from '../db/schema/users'
// import Google from '@auth/core/providers/google'

export const authOptions: SolidAuthConfig = {
  adapter: DrizzleAdapter(db, {
    accountsTable: accounts,
    authenticatorsTable: authenticators,
    sessionsTable: sessions,
    usersTable: users,
    verificationTokensTable: verificationTokens,
  }),
  basePath: '/api/auth',
  debug: process.env.NODE_ENV === 'development',
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    }),
    // Google({}),
  ],
  session: {
    strategy: 'jwt',
  },
}
