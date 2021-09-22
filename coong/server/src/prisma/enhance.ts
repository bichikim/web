import {permissions} from 'src/auth'
import SelfAuthorized from 'src/decorators/SelfAuthorized'
import Forbidden from 'src/decorators/Forbidden'
import Author from 'src/decorators/Author'
import {applyModelsEnhanceMap, applyResolversEnhanceMap} from 'src/generated/type-graphql'
import {Authorized} from 'type-graphql'
import {Context} from 'src/context'

const {privateUser, publicPost} = permissions

const CreateAuthor = Author<Context, Context['auth']['self']>(({args}, self) =>
  (args.data.author = {connect: {id: self?.id}}))
const SelfForbiddenAuthor = Forbidden(({args}, self) => Boolean(self && args.data.author))

/**
 * @see https://github.com/MichalLytek/typegraphql-prisma
 */
applyResolversEnhanceMap({
  Post: {
    createManyPost: [Authorized([publicPost.create])],
    createPost: [
      Authorized([publicPost.create, publicPost.self]),
      CreateAuthor,
    ],
    deleteManyPost: [Authorized([publicPost.delete])],
    deletePost: [Authorized([publicPost.delete, publicPost.self])],
    findFirstPost: [Authorized([publicPost.read])],
    post: [Authorized([publicPost.read])],
    posts: [Authorized([publicPost.read])],
    updateManyPost: [Authorized([publicPost.update])],
    updatePost: [
      Authorized([publicPost.update, publicPost.self]),
      SelfForbiddenAuthor,
    ],
    upsertPost: [Authorized([publicPost.update])],
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
    users: [Authorized([privateUser.read, privateUser.self])],
  },
})

const PostSelfAuthorized = SelfAuthorized(({root}) => ({id: root.authorId}))
const UserSelfAuthorized = SelfAuthorized(({root}) => ({id: root.id}))

applyModelsEnhanceMap({
  Post: {
    fields: {
      _all: [PostSelfAuthorized],
    },
  },
  User: {
    fields: {
      _all: [UserSelfAuthorized],
    },
  },
})
