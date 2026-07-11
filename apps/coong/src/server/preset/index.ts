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

export const isKnownPresetId = (id: string): boolean => {
  return id in presetMap
}

export const getPresetEnforceMusics = (
  id: string | undefined,
  preset: Preset | undefined,
): MusicInfo[] | undefined => {
  if (!id || !preset || !isKnownPresetId(id)) {
    return undefined
  }

  // AI_NOTE - reject stale UNKNOWN_PRESET when preset id changes via client navigation
  if (preset.title === UNKNOWN_PRESET.title) {
    return undefined
  }

  return preset.musics
}

export const getPresetData = (id: string): Preset => {
  return presetMap[id] ?? UNKNOWN_PRESET
}
