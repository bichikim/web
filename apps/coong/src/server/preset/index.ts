import hiddenTeenieping from 'src/routes/api/preset/hidden-teenieping.json'
import {type MusicInfo} from 'src/components/midi-player/SFileItem'

export interface Preset {
  id: string
  musics: MusicInfo[]
  title: string
}

const UNKNOWN_PRESET: Preset = {id: '', musics: [], title: 'Unknown Preset'}

const presetMap: Record<string, Preset> = {
  'hidden-teenieping': {
    id: 'hidden-teenieping',
    musics: hiddenTeenieping,
    title: 'Hidden Teenieping',
  },
}

export const isKnownPresetId = (id: string): boolean => {
  return id in presetMap
}

export const getPresetEnforceMusics = (
  id: string | undefined,
  preset: Preset | undefined,
): MusicInfo[] | undefined => {
  if (!id || !preset || !isKnownPresetId(id) || preset.id !== id) {
    return undefined
  }

  return preset.musics
}

export const getPresetData = (id: string): Preset => {
  return presetMap[id] ?? UNKNOWN_PRESET
}
