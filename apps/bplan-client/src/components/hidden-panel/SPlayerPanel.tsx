import {SPlayerPanelBody, SPlayerPanelBodyProps} from './SPlayerPanelBody'
import {SPlayer} from 'src/components/midi-player'

export interface SPlayerPanelProps extends SPlayerPanelBodyProps {
  //
}

export const SPlayerPanel = (props: SPlayerPanelProps) => {
  return (
    <SPlayerPanelBody {...props}>
      <SPlayer />
    </SPlayerPanelBody>
  )
}
