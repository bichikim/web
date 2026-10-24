import {SPlayerPanelBody, SPlayerPanelBodyProps} from './SPlayerPanelBody'
import {SPlayer} from 'src/components/midi-player'
import {cx} from 'class-variance-authority'

export interface SPlayerPanelProps extends SPlayerPanelBodyProps {
  //
}

export const SPlayerPanel = (props: SPlayerPanelProps) => {
  return (
    <SPlayerPanelBody {...props} class={cx(props.class, 'min-h-56 max-h-max p-2')}>
      <SPlayer />
    </SPlayerPanelBody>
  )
}
