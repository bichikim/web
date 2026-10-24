import {action} from '@solidjs/router'
import {fetchSignUp} from 'src/server/functions/auth/fetch-sign-up'

export const signUpAction = action(fetchSignUp, 'auth/sign-up')
