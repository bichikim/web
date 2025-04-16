import {APIEvent} from '@solidjs/start/server'
import hiddenTeenieping from './hidden-teenieping.json'
import {Preset} from 'src/types/api'

const presetMap: Record<string, Preset> = {
  'hidden-teenieping': {
    musics: hiddenTeenieping,
    title: 'Hidden Teenieping',
  },
}

export async function GET(event: APIEvent) {
  const {id} = event.params
  const preset = presetMap[id] ?? {musics: [], title: 'Unknown Preset'}

  return preset
}
