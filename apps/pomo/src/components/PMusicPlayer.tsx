import type {PMusicPlayerContentProps} from './music-player/types'
import {PMusicPlayerPanel} from './music-player/PMusicPlayerPanel'

export interface PMusicPlayerProps extends PMusicPlayerContentProps {}

export const PMusicPlayer = (props: PMusicPlayerProps) => <PMusicPlayerPanel {...props} />
