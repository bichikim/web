import type {Header} from '@winter-love/tonejs-midi'
import type {DrumMachine} from 'smplr'

export interface MusicData {
  channelName?: string | number
  ext?: string
  generated?: boolean
  header?: Header
  id: string
  midi?: Parameters<DrumMachine['start']>[0][][]
  name: string
  totalDuration: number
}
