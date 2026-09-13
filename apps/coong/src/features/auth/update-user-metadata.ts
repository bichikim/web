import {action} from '@solidjs/router'
import {fetchUpdateUserMetadata} from 'src/server/functions/auth/fetch-update-user-metadata'

export const updateUserMetadataAction = action(fetchUpdateUserMetadata, 'auth/update-user-metadata')
