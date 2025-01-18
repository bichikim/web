import {createResource} from 'solid-js'
import {MusicInfo} from 'src/components/midi-player'
import {default as HomePage} from 'src/routes/(main-layout)/(home)'
import {useParams} from '@solidjs/router'

const getSelfUrl = () => {
  return import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
}

interface Data {
  musics: MusicInfo[]
  title: string
}
const getPreset = async (id?: string): Promise<Data | undefined> => {
  'use server'

  if (!id) {
    return
  }

  return fetch(`${getSelfUrl()}/api/preset/${id}`).then((res) => {
    if (res.ok) {
      return res.json()
    }

    return {musics: [], title: 'Unknown'}
  })
}

export default function PresetPage() {
  const params = useParams()
  // solidjs/router query send empty page time to time
  // do not use createAsync because it create a template and it does not work
  // createResource also make the template and it does not work
  const [preset] = createResource(() => getPreset(params.id))
  // const preset = () => ({musics: [], title: 'Unknown'})

  return <HomePage presetTitle={preset()?.title} />
}
