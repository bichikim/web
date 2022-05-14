import {list} from '@keystone-6/core'
import {relationship, text} from '@keystone-6/core/fields'
import {isAdmin, isUser} from '#utils'

export const PublicKey = list({
  access: {
    operation: {
      create: isUser,
      delete: isAdmin,
      update: isAdmin,
    },
  },
  fields: {
    author: relationship({
      ref: 'User.publicKeys',
    }),
    value: text({validation: {isRequired: true}}),
  },
  ui: {
    listView: {
      initialColumns: ['author', 'value'],
    },
  },
})
