// noinspection ES6PreferShortImport

import {list} from '@keystone-6/core'
import {checkbox, json, password, relationship, text} from '@keystone-6/core/fields'
import {isSelfField as _isSelfField, AuthArgs, isAdmin, or} from '#utils'
import {Lists} from '.keystone/types'

const isSelfField = _isSelfField<Lists.User.TypeInfo>((item) => item?.id)

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
      // access: {
      //   // 패스워드는 보호 됨으로 읽혀 저도 상관없다 읽는게 패스워드 값을 읽는게 아니라 패스워드가 있는지 여부만 알 수 있있다
      //   update: or([isAdmin, isSelfField]),
      // },
      validation: {isRequired: false},
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
      },
      many: true,
      ref: 'Post.author',
    }),

    /**
     * wallet address or else
     */
    publicKeys: relationship({
      access: {
        create: isAdmin,
        update: isAdmin,
      },
      many: true,
      ref: 'PublicKey.author',
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
