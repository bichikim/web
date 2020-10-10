import {get} from 'lodash'

export const castFeed = (feed: any, theme: Record<string, any> = {}) => {
  if (Array.isArray(feed)) {
    const props = {}
    feed.forEach((value) => {
      if (typeof value === 'object') {
        Object.assign(props, value)
        return
      }
      if (typeof value === 'string' || Array.isArray(value)) {
        Object.assign(props, get(theme, value))
      }
    })
    return props
  }
  if (typeof feed === 'object') {
    return {...feed}
  }

  return {}
}
