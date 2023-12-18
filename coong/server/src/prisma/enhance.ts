import {applyModelsEnhanceMap, applyResolversEnhanceMap} from './type-graphql/enhance'
import {Authorized} from 'type-graphql'
import {forbidden, hasSome, role, user} from 'src/auth'

const getPostAuthorConnect = (data) => {
  const {id, email} = data?.author?.connect ?? {}
  return {email, id}
}

const getPostForbiddenData = (data) => ({
  authorConnectOrCreate: data?.author?.connectOrCreate,
  authorCreate: data?.author?.create,
  likeIDs: data?.likeIDs,
  likes: data?.likes,
})

/**
 * @see https://github.com/MichalLytek/typegraphql-prisma
 */
applyResolversEnhanceMap({
  Post: {
    aggregatePost: [Authorized([role('admin')])],
    createManyPost: [
      Authorized([
        //
        role('admin'),
        user(
          ({args}) => args.data.map((data) => getPostAuthorConnect(data)),
          forbidden(({args: {data}}) =>
            hasSome(data.map((data) => getPostForbiddenData(data))),
          ),
        ),
      ]),
    ],
    createOnePost: [
      Authorized([
        //
        role('admin'),
        user(
          ({args}) => getPostAuthorConnect(args.data),
          forbidden(({args: {data}}) => hasSome(getPostForbiddenData(data))),
        ),
      ]),
    ],
    deleteManyPost: [Authorized([role('admin')])],
    deleteOnePost: [Authorized([role('admin')])],
    findFirstPost: [Authorized([role('admin')])],
    groupByPost: [Authorized([role('admin')])],
    post: [],
    posts: [],
    updateManyPost: [Authorized([role('admin')])],
    updateOnePost: [Authorized([role('admin')])],
    upsertOnePost: [Authorized([role('admin')])],
  },
  User: {
    _all: [Authorized([role('admin')])],
  },
})

// aggregateUser: [Authorized([privateUser.read, privateUser.self])],
// createManyUser: [Authorized([privateUser.create])],
// // createUser: [Authorized([privateUser.create])],
// deleteManyUser: [Authorized([privateUser.delete])],
// // deleteUser: [Authorized([privateUser.delete])],
// findFirstUser: [Authorized([privateUser.read])],
// groupByUser: [Authorized([privateUser.read])],
// updateManyUser: [Authorized([privateUser.update])],
// // updateUser: [Authorized([privateUser.update])],
// // upsertUser: [Authorized([privateUser.update, privateUser.create])],
// user: [Authorized(privateUser.read, privateUser.self), SelfAuthorized(({args}) => args.where)],
// users: [Authorized(privateUser.read, privateUser.self)],
// const PostSelfAuthorized = SelfAuthorized(({root}) => ({id: root.authorId}))
// const UserSelfAuthorized = SelfAuthorized(({root}) => ({id: root.id}))

applyModelsEnhanceMap({
  Post: {
    fields: {
      _all: [],
    },
  },
  User: {
    fields: {
      _all: [],
    },
  },
})
