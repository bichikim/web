import {action} from '@solidjs/router'
import {fetchResetPassword} from 'src/server/functions/auth/fetch-reset-password'

export const resetPasswordAction = action(fetchResetPassword, 'auth/reset-password')
