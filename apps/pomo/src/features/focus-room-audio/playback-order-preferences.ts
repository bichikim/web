import type {PreferenceOptions} from 'src/hooks/use-preference'
import type {RepeatMode} from './playback-policy'

export const repeatModePreference: PreferenceOptions<RepeatMode> = {
  defaultValue: 'repeat-all',
  key: 'pomo:music-repeat:v1',
  parse: (value) => {
    switch (value) {
      case 'none':
      case 'repeat-all':
      case 'repeat-one':
        return value
      default:
        return null
    }
  },
}

export const shufflePreference: PreferenceOptions<boolean> = {
  defaultValue: true,
  key: 'pomo:music-shuffle:v1',
  parse: (value) => (typeof value === 'boolean' ? value : null),
}
