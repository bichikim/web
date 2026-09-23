import type {MusicData} from 'src/features/music'

export interface Preset {
  id: string
  musics: MusicData[]
  title: string
}

export const PRESET_ID = 'hidden-teenieping'

export const isKnownPresetId = (id: string): boolean => {
  return id === PRESET_ID
}

export const getPresetEnforceMusics = (
  id: string | undefined,
  preset: Preset | undefined,
): MusicData[] | undefined => {
  if (!id || !preset || !isKnownPresetId(id) || preset.id !== id) {
    return undefined
  }

  return preset.musics
}
