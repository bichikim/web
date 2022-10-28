import {createAuthInputGate, GateRoles} from '../'
import {ResolverData} from 'type-graphql'

describe('role', () => {
  it('should return true with read user', () => {
    const readRoles: GateRoles = {
      output: {
        disallow: ['root.password'],
      },
      roles: {
        'publicUser.read': {
          input: {
            disallow: ['args.where.email', 'args.where.id'],
          },
          output: {
            disallow: ['root.email', 'root.money'],
          },
        },
        'publicUser.self': {
          input: {
            compareId: 'args.where.id',
          },
          output: {
            compareId: 'root.id',
          },
        },
      },
    }

    const user = {
      id: 500,
      roles: ['publicUser.read', 'publicUser.self'],
    }

    const data: ResolverData = {
      args: {
        data: {
          where: {
            id: 500,
          },
        },
      },
      context: {},
      info: {} as any,
      root: {},
    }

    const inputGate = createAuthInputGate(readRoles)

    expect(inputGate(data, user.roles, user.id)).toBe(false)
  })
  // it('should return true with read post', () => {
  //   const readRoles: GateRoles = {
  //     roles: {
  //       'publicPost.read': true,
  //       'publicUser.self': {
  //         input: {
  //           compareId: 'args.where.authorId',
  //         },
  //         output: {
  //           compareId: 'root.authorId',
  //         },
  //       },
  //     },
  //   }
  //
  //   const user = {
  //     id: 500,
  //     roles: ['publicUser.read', 'publicUser.self'],
  //   }
  // })
  // it('should return true with create post', () => {
  //   const readRoles: GateRoles = {
  //     input: {
  //       disallow: ['args.author.create', 'args.author.connectOrCreate'],
  //     },
  //     roles: {
  //       'publicUser.create': {
  //         input: {
  //           compareId: 'args.where.author.connect.id',
  //         },
  //       },
  //     },
  //   }
  //
  //   const user = {
  //     id: 500,
  //     roles: ['publicUser.read', 'publicUser.self'],
  //   }
  // })
  // it('should return true with create posts', () => {
  //   const readRoles: GateRoles = {
  //     input: {
  //       disallow: ['args.linkIDs'],
  //     },
  //     roles: {
  //       'publicUser.create': {
  //         input: {
  //           compareId: 'args.where.authorId',
  //         },
  //       },
  //     },
  //   }
  //
  //   const user = {
  //     id: 500,
  //     roles: ['publicUser.read', 'publicUser.self'],
  //   }
  // })
})
