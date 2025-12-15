import {client} from 'src/server/trpc/client'

type FetchData = Parameters<typeof client.musicPosts.createMusicPost.mutate>[0]

const createMusicPosts = async (payload: FetchData | null) => {
  'use server'

  if (!payload) {
    return null
  }

  return client.musicPosts.createMusicPost.mutate(payload)
}

const deleteAllMusicPosts = async () => {
  'use server'

  return client.musicPosts.deleteAllMusicPost.mutate()
}

const handleClick = () => {
  createMusicPosts({
    authorId: '2',
    content: 'content2',
    title: 'title2',
  })
}

const handleDeleteAll = () => {
  deleteAllMusicPosts()
}

export default function MusicPostCreate() {
  return (
    <div>
      <button onClick={handleClick}>create</button>
      <button onClick={handleDeleteAll}>delete All</button>
    </div>
  )
}
