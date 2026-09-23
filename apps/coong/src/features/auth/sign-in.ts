import {action} from '@solidjs/router'
import {fetchSignIn} from 'src/server/functions/auth/fetch-sign-in'

export const signInAction = action(fetchSignIn, 'auth/sign-in')
