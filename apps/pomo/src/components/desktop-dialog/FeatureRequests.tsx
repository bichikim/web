import {closeDesktopDialog} from '../../features/desktop-mode/dialogs'
import {PFeatureRequest} from '../p-feature-request/PFeatureRequest'

export const DesktopFeatureRequestsDialog = () => (
  <PFeatureRequest
    desktopDialog
    onRequestClose={() => {
      closeDesktopDialog('featureRequests').catch((error: unknown) => {
        console.error('Failed to close the desktop feature requests dialog.', error)
      })
    }}
    sceneStyle="original"
  />
)
