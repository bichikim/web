import {action} from '@solidjs/router'
import {fetchDeleteAccount} from 'src/server/functions/auth/fetch-delete-account'

export const deleteAccountAction = action(fetchDeleteAccount, 'auth/delete-account')
