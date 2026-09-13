import {action} from '@solidjs/router'
import {fetchSignOut} from 'src/server/functions/auth/fetch-sign-out'

export const signOutAction = action(fetchSignOut, 'auth/sign-out')
