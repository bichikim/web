import * as m from '@paraglide/message'

import {closeDesktopDialog} from '../../features/desktop-mode/dialogs'
import {PPomodoro} from '../p-pomodoro/PPomodoro'
import {DesktopDialogFrame} from './Frame'

export const DesktopPomodoroDialog = () => (
  <DesktopDialogFrame
    onClose={() => {
      closeDesktopDialog('pomodoro').catch((error: unknown) => {
        console.error('Failed to close the desktop Pomodoro dialog.', error)
      })
    }}
    title={m.pomodoro_title()}
  >
    <PPomodoro desktopDialog />
  </DesktopDialogFrame>
)
