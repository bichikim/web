import hiddenTeenieping from 'src/routes/api/preset/hidden-teenieping.json'
import {type Preset, PRESET_ID} from 'src/features/preset'

const UNKNOWN_PRESET: Preset = {id: '', musics: [], title: 'Unknown Preset'}

const presetMap: Record<string, Preset> = {
  [PRESET_ID]: {
    id: PRESET_ID,
    musics: hiddenTeenieping,
    title: 'Hidden Teenieping',
  },
}

export const getPresetData = (id: string): Preset => {
  return Object.hasOwn(presetMap, id) ? presetMap[id] : UNKNOWN_PRESET
}
