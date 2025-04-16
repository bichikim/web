import {SolidAuth} from '@auth/solid-start'
import {authOptions} from 'src/server/auth/config'
// import Google from '@auth/core/providers/google'

export const {GET, POST} = SolidAuth(authOptions)
