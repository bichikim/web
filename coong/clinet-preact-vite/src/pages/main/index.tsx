import {PageProps} from 'src/types'
import {Counter} from './Counter'
import {getPosts} from './get-posts'
import {useQuery} from '@urql/preact'
import {Post} from './Post'
import {useMemo} from 'preact/hooks'

export const MainPage = (_: PageProps) => {
  const [result] = useQuery({query: getPosts})
  const postsData = result?.data?.posts

  const posts = useMemo(() => {
    if (Array.isArray(postsData)) {
      return postsData.map((post) => {
        return <Post {...post}></Post>
      })
    }
  }, [postsData])

  return (
    <div>
      {posts}
      <Counter />
      <Counter />
    </div>
  )
}
