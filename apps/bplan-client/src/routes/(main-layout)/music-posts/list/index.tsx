import {client} from 'src/server/trpc/client'
import {createResource, For} from 'solid-js'

const getMusicPosts = async () => {
  'use server'

  return client.musicPosts.getMusicPostList.query({
    limit: 100,
  })
}

export default function MusicPostList() {
  const [musicPosts] = createResource(() => getMusicPosts())

  return (
    <div>
      <For each={musicPosts()}>
        {(musicPost) => (
          <div>
            {musicPost.title} {musicPost.content}
          </div>
        )}
      </For>
    </div>
  )
}
