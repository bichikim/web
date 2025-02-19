import {SolidAuth, type SolidAuthConfig} from '@auth/solid-start'
import GitHub from '@auth/core/providers/github'
// import Google from '@auth/core/providers/google'

export const authOpts: SolidAuthConfig = {
  debug: import.meta.env.DEV,
  providers: [
    //
    GitHub({}),
    // Google({}),
  ],
}

export const {GET, POST} = SolidAuth(authOpts)
