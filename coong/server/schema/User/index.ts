// noinspection ES6PreferShortImport

import {list} from '@keystone-6/core'
import {checkbox, json, password, relationship, text} from '@keystone-6/core/fields'
import {AuthArgs, isAdmin, or} from '../../utils'
import {Lists} from '.keystone/types'

const isSelfField = (args: AuthArgs<Lists.User.TypeInfo>) => {
  const {session, item} = args
  return item?.id === session.itemId
}

const isSelfFilter = (args: AuthArgs) => {
  const {session, operation} = args
  // todo fix logic
  if (operation === 'query') {
    return {id: {equals: session.itemId}}
  }
  return {id: {equals: session.itemId}}
}

export const User = list({
  access: {
    filter: {
      update: or([isAdmin, isSelfFilter], true),
    },
    operation: {
      delete: isAdmin,
    },
  },
  // Here are the fields that `User` will have. We want an email and password so they can log in
  // a name so we can refer to them, and a way to connect users to posts.
  fields: {
    email: text({
      access: {
        read: or([isAdmin, isSelfField]),
        update: or([isAdmin, isSelfField]),
      },
      isFilterable: true,
      isIndexed: 'unique',
      validation: {isRequired: true},
    }),

    follower: relationship({
      access: {
        create: isAdmin,
        update: isAdmin,
      },
      many: true,
      ref: 'User.following',
    }),

    following: relationship({
      access: {
        create: isAdmin,
        update: or([isAdmin, isSelfField]),
      },
      many: true,
      ref: 'User.follower',
    }),

    isAdmin: checkbox({
      access: {
        create: isAdmin,
        read: or([isAdmin, isSelfField]),
        update: isAdmin,
      },
      defaultValue: false,
    }),

    name: text({validation: {isRequired: true}}),

    // The password field takes care of hiding details and hashing values
    password: password({
      access: {
        // 패스워드는 보호 됨으로 읽혀 저도 상관없다 읽는게 패스워드 값을 읽는게 아니라 패스워드가 있는지 여부만 알 수 있있다
        update: or([isAdmin, isSelfField]),
      },
      validation: {isRequired: true},
    }),

    postLikes: relationship({
      access: {
        create: isAdmin,
        update: isAdmin,
      },
      many: true,
      ref: 'Post.likes',
    }),

    // Relationships allow us to reference other lists. In this case,
    // we want a user to have many posts, and we are saying that the user
    // should be referencable by the 'author' field of posts.
    // Make sure you read the docs to understand how they work: https://keystonejs.com/docs/guides/relationships#understanding-relationships
    posts: relationship({
      access: {
        create: isAdmin,
        update: isAdmin,
      }, many: true,
      ref: 'Post.author',
    }),

    roles: json({
      access: {
        create: isAdmin,
        read: isAdmin,
        update: isAdmin,
      },
      defaultValue: '[]',
    }),
  },
  // Here we can configure the Admin UI. We want to show a user's name and posts in the Admin UI
  ui: {
    listView: {
      initialColumns: ['name', 'email', 'isAdmin'],
    },
  },
})
