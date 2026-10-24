import {action} from '@solidjs/router'
import {fetchChangePassword} from 'src/server/functions/auth/fetch-change-password'

export const changePasswordAction = action(fetchChangePassword, 'auth/change-password')
