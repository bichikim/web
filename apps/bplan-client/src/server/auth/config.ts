import {type SolidAuthConfig} from '@auth/solid-start'
import GitHub from '@auth/core/providers/github'
// import Google from '@auth/core/providers/google'

export const authOptions: SolidAuthConfig = {
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
