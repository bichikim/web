import {permissions} from 'src/auth'
import SelfAuthorized from 'src/decorators/SelfAuthorized'
import {applyModelsEnhanceMap, applyResolversEnhanceMap} from 'src/generated/type-graphql'
import {Authorized} from 'type-graphql'

const {privateUser, publicPost} = permissions

/**
 * @see https://github.com/MichalLytek/typegraphql-prisma
 */
applyResolversEnhanceMap({
  Post: {
    createPost: [Authorized([publicPost.create])],
  },
  User: {
    aggregateUser: [Authorized([privateUser.read])],
    createManyUser: [Authorized([privateUser.create])],
    createUser: [Authorized([privateUser.create])],
    deleteManyUser: [Authorized([privateUser.delete])],
    deleteUser: [Authorized([privateUser.delete])],
    findFirstUser: [Authorized([privateUser.read])],
    groupByUser: [Authorized([privateUser.read])],
    updateManyUser: [Authorized([privateUser.update])],
    updateUser: [Authorized([privateUser.update])],
    upsertUser: [Authorized([privateUser.update, privateUser.create])],
    user: [Authorized(privateUser.read, privateUser.self)],
    users: [Authorized([privateUser.read])],
  },
})

applyModelsEnhanceMap({
  Post: {
    fields: {
      _all: [SelfAuthorized(({root}) => ({id: root.authorId}))],
    },
  },
  User: {
    fields: {
      _all: [SelfAuthorized(({root}) => ({id: root.id}))],
    },
  },
})
