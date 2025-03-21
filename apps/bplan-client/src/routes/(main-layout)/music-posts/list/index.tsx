import {client} from 'src/trpc/client'
import {createResource, For} from 'solid-js'

const getMusicPosts = async () => {
  'use server'

  return client.musicPosts.getMusicPostList.query({})
}

export default function MusicPosts() {
  const [musicPosts] = createResource(() => getMusicPosts())

  return (
    <div>
      <For each={musicPosts()}>{(musicPost) => <div>{musicPost.title}</div>}</For>
    </div>
  )
}
