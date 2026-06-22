import hiddenTeenieping from 'src/routes/api/preset/hidden-teenieping.json'
import {type MusicInfo} from 'src/components/midi-player/SFileItem'

export interface Preset {
  musics: MusicInfo[]
  title: string
}

const UNKNOWN_PRESET: Preset = {musics: [], title: 'Unknown Preset'}

const presetMap: Record<string, Preset> = {
  'hidden-teenieping': {
    musics: hiddenTeenieping,
    title: 'Hidden Teenieping',
  },
}

export const getPresetData = (id: string): Preset => {
  return presetMap[id] ?? UNKNOWN_PRESET
}
