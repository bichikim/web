// noinspection ES6PreferShortImport

import {list} from '@keystone-6/core'
import {image, relationship, select, text, timestamp} from '@keystone-6/core/fields'
import {document} from '@keystone-6/fields-document'
import {AuthArgs, isAdmin, or} from '../../utils'
import {Lists} from '.keystone/types'

const isSelfItem = (args: AuthArgs<Lists.Post.TypeInfo>) => {
  const {item, session, operation, inputData} = args
  const {authorId} = item ?? {}

  if (operation === 'create') {
    const id = inputData?.author?.connect?.id
    if (typeof id === 'undefined') {
      return false
    }
    return id === session.itemId
  }

  return authorId === session.itemId
}

const isSelfFilter = (args: AuthArgs) => {
  const {session} = args

  return {authorId: {equals: session.itemId}}
}

export const Post = list({
  access: {
    filter: {
      delete: or([isAdmin, isSelfFilter], true),
    },
    item: {
      create: or([isAdmin, isSelfItem]),
      delete: or([isAdmin, isSelfItem]),
      update: or([isAdmin, isSelfItem]),
    },
  },
  fields: {

    // Here is the link from post => author.
    // We've configured its UI display quite a lot to make the experience of editing posts better.
    author: relationship({
      ref: 'User.posts',
    }),

    children: relationship({
      many: true,
      ref: 'Post.parent',
    }),

    // The document field can be used for making highly editable content. Check out our
    // guide on the document field https://keystonejs.com/docs/guides/document-fields#how-to-use-document-fields
    // for more information
    content: document({
      dividers: true,
      formatting: true,
      layouts: [
        [1, 1],
        [1, 1, 1],
        [2, 1],
        [1, 2],
        [1, 2, 1],
      ],
      links: true,
    }),

    likes: relationship({
      many: true,
      ref: 'User.postLikes',
    }),

    parent: relationship({
      ref: 'Post.children',
    }),

    publishDate: timestamp(),

    // Having the status here will make it easy for us to choose whether to display
    // posts on a live site.
    status: select({
      // We want to make sure new posts start off as a draft when they are created
      defaultValue: 'draft',

      options: [
        {label: 'Published', value: 'published'},
        {label: 'Draft', value: 'draft'},
      ],
      // fields also have the ability to configure their appearance in the Admin UI
      ui: {
        displayMode: 'segmented-control',
      },
    }),

    // We also link posts to tags. This is a many <=> many linking.
    tags: relationship({
      many: true,
      ref: 'Tag.posts',
      ui: {
        cardFields: ['name'],
        displayMode: 'cards',
        inlineConnect: true,
        inlineCreate: {fields: ['name']},
        inlineEdit: {fields: ['name']},
        linkToItem: true,
      },
    }),

    thumbnail: image(),

    title: text(),
  },
  graphql: {
    queryLimits: {maxResults: 50},
  },
})
