const castFeed = (feed: any) => {
  if (Array.isArray(feed)) {
    const props = {}
    feed.forEach((value) => {
      if (typeof value === 'object') {
        Object.assign(props, value)
      }
    })
    return props
  }
  if (typeof feed === 'object') {
    return {...feed}
  }

  return {}
}

interface UseFeedProps {
  feed?: any
}

export const useFeed = (props: UseFeedProps): Record<string, any> => {
  const {feed} = props
  return castFeed(feed)
}
