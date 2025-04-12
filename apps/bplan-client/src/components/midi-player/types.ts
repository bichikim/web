import {DrumMachine} from 'smplr'

export type SampleStart = Parameters<DrumMachine['start']>[0]

export type RepeatType = 'no' | 'all' | 'one'
