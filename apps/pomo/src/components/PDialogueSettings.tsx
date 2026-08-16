import {clientOnly} from '@solidjs/start'

const PDialogueSettingsContent = clientOnly(() => import('./PDialogueSettingsContent'), {
  lazy: true,
})

export interface PDialogueSettingsProps {
  readonly onRequestClose?: () => void
}

export const PDialogueSettings = (props: PDialogueSettingsProps) => (
  <PDialogueSettingsContent onRequestClose={props.onRequestClose} />
)
