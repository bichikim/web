import {query, useParams} from '@solidjs/router'
import {createResource} from 'solid-js'
import {default as HomePage} from 'src/routes/(main-layout)/(home)'

const getSelfUrl = () => {
  return import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
}

const getPreset = query(async (id?: string) => {
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
}, 'preset')

export default function PresetPage() {
  const params = useParams()
  // const [preset] = createResource(() => getPreset(params.id))
  const preset = () => ({musics: [], title: 'Unknown'})

  return <HomePage presetTitle={preset()?.title} initMusics={preset()?.musics} />
}
