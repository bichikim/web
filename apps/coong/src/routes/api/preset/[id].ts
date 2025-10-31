import {APIEvent} from '@solidjs/start/server'
import hiddenTeenieping from './hidden-teenieping.json'
import {type MusicInfo} from 'src/components/midi-player/SFileItem'

export interface Preset {
  musics: MusicInfo[]
  title: string
}

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
