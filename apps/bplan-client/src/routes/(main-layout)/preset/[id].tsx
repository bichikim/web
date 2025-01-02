import {default as HomePage} from 'src/routes/(main-layout)/(home)'
import {createAsync, query, useParams} from '@solidjs/router'

const getSelfUrl = () => {
  return import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
}

const getPreset = query(async (id?: string) => {
  if (!id) {
    return
  }
  const preset = await fetch(`${getSelfUrl()}/api/preset/${id}`).then((res) => {
    if (res.ok) {
      return res.json()
    }

    return {musics: [], title: 'Unknown'}
  })
  return preset
}, 'preset')

export default function PresetPage() {
  const params = useParams()
  const preset = createAsync(() => getPreset(params.id))
  return <HomePage presetTitle={preset()?.title} initMusics={preset()?.musics} />
}
