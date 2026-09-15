import {closeDesktopDialog} from '../../features/desktop-mode/dialogs'
import {PVersionNotice} from '../p-version-notice/PVersionNotice'

export const DesktopVersionNoticeDialog = () => (
  <PVersionNotice
    desktopDialog
    onRequestClose={() => {
      closeDesktopDialog('versionNotice').catch((error: unknown) => {
        console.error('Failed to close the desktop version notice dialog.', error)
      })
    }}
    sceneStyle="original"
  />
)
