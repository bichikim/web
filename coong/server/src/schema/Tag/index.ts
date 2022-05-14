// noinspection ES6PreferShortImport

import {list} from '@keystone-6/core'
import {relationship, text} from '@keystone-6/core/fields'
import {isAdmin, isUser} from '#utils'

export const Tag = list({
  access: {
    operation: {
      create: isUser,
      delete: isAdmin,
      update: isAdmin,
    },
  },
  fields: {
    name: text(),
    posts: relationship({many: true, ref: 'Post.tags'}),
  },
  ui: {
    isHidden: true,
  },
})
