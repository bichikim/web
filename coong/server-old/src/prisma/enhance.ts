import {permissions} from 'src/auth'
import {Forbidden, SelfAuthorized} from 'src/decorators'
import {applyModelsEnhanceMap, applyResolversEnhanceMap} from 'src/generated/type-graphql'
import {Authorized} from 'type-graphql'
import {Context} from 'src/context'

const {privateUser, publicPost} = permissions

const createMutationManySelfAuthorized = (target: string) =>
  SelfAuthorized<Context>(async ({args, context}) => {
    const {prisma} = context

    const posts = await prisma[target].findMany({
      include: {
        author: {
          select: {
            email: true,
            id: true,
          },
        },
      },
      where: args.where,
    })

    return posts.map(({author}) => {
      return author
    })
  })

/**
 * @see https://github.com/MichalLytek/typegraphql-prisma
 */
applyResolversEnhanceMap({
  Post: {
    createManyPost: [
      Authorized([publicPost.create, publicPost.self]),
      Forbidden(({args}, self) => {
        return Boolean(self && args.data.some(({linkIDs}) => Boolean(linkIDs)))
      }),
      SelfAuthorized(({args}) => args.data.map(({authorId}) => ({id: authorId}))),
    ],
    // createManyPost: [Authorized([publicPost.create])],
    createPost: [
      Authorized([publicPost.create, publicPost.self]),
      /**
       * forbidden using author create and connectOrCreate
       */
      Forbidden(({args}, self) => {
        const {author} = args.data
        return Boolean(self && (!author || author.create || author.connectOrCreate))
      }),
      SelfAuthorized(({args}) => args.data?.author?.connect),
    ],
    deleteManyPost: [
      Authorized([publicPost.delete, publicPost.self]),
      createMutationManySelfAuthorized('post'),
    ],
    deletePost: [Authorized([publicPost.delete, publicPost.self])],
    // findFirstPost: [Authorized([publicPost.read])],
    // post: [Authorized([publicPost.read])],
    // posts: [Authorized([publicPost.read])],
    // updateManyPost: [Authorized([publicPost.update])],
    // updatePost: [
    //   Authorized([publicPost.update, publicPost.self]),
    //   SelfForbiddenAuthor,
    // ],
    // upsertPost: [Authorized([publicPost.update])],
  },
  User: {
    aggregateUser: [Authorized([privateUser.read, privateUser.self])],
    createManyUser: [Authorized([privateUser.create])],
    createUser: [Authorized([privateUser.create])],
    deleteManyUser: [Authorized([privateUser.delete])],
    deleteUser: [Authorized([privateUser.delete])],
    findFirstUser: [Authorized([privateUser.read])],
    groupByUser: [Authorized([privateUser.read])],
    updateManyUser: [Authorized([privateUser.update])],
    updateUser: [Authorized([privateUser.update])],
    upsertUser: [Authorized([privateUser.update, privateUser.create])],
    user: [Authorized(privateUser.read, privateUser.self), SelfAuthorized(({args}) => args.where)],
    users: [Authorized(privateUser.read, privateUser.self)],
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
