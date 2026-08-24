import {PDialogueSettingsPanel} from './dialogue-settings/Panel'

export interface PDialogueSettingsProps {
  readonly onRequestClose?: () => void
}

export const PDialogueSettings = (props: PDialogueSettingsProps) => (
  <PDialogueSettingsPanel onRequestClose={props.onRequestClose} />
)
