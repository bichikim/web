import {list} from '@keystone-6/core'
import {relationship, text} from '@keystone-6/core/fields'

export const Tag = list({
  fields: {
    name: text(),
    posts: relationship({many: true, ref: 'Post.tags'}),
  },
  ui: {
    isHidden: true,
  },
})
