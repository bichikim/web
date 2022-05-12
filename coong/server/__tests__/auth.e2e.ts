// noinspection JSUnusedLocalSymbols

import {setupTestRunner, TestArgs} from '@keystone-6/core/testing'
import config from '../keystone'
import {gql} from 'graphql-tag'

const runner = setupTestRunner({config})

describe('coong/server/user-read', () => {

  const generateData = async ({context}: TestArgs) => {
    const userCount = await context.query.User.count()
    // 유저 Foo 생성
    const userFoo = await context.query.User.createOne({
      data: {email: 'foo@foo.com', name: 'foo', password: 'super-secret'},
      query: 'id name password { isSet }',
    })

    // 유저 Bar 생성
    const userBar = await context.query.User.createOne({
      data: {email: 'bar@bar.com', name: 'bar', password: 'super-secret'},
      query: 'id name password { isSet }',
    })

    // 유저 Foo Post 생성
    const postFoo = await context.withSession({
      data: {
        //
      },
      itemId: userFoo.id,
    }).graphql.raw({
      query: gql`
        mutation ($data: PostCreateInput!) {
          createPost(data: $data) {
            id,
          }
        }
      `,
      variables: {
        data: {
          author: {
            connect: {
              id: userFoo.id,
            },
          },
          tags: {
            create: {
              name: 'test',
            },
          },
          title: 'test',
        },
      },
    })

    return {
      postFoo,
      userBar,
      userFoo,
    }
  }

  it('should protect reading user data', runner(async (args) => {
    const {userBar, userFoo, postFoo} = await generateData(args)
    const {context} = args

    expect(userFoo.name).toBe('foo')

    const postId = postFoo.data?.createPost?.id

    //--> 읽기 테스트

    // 비인증 유저검색
    const {data, errors} = await context.graphql.raw({
      query: gql`
        query ($id: ID!) {
          user(where: {id: $id}) {
            id
            email
            follower {
              id
              email
              isAdmin
              name
              password {
                isSet
              }
              roles
            }
            following {
              email
            }
            publicKeys {
              author {
                email
              }
              value
            }
            isAdmin
            postLikes {
              author {
                id
                email
                name
                isAdmin
                password {
                  isSet
                }
                roles
              }
            }
            postLikesCount
            name
            password {
              isSet
            }
            posts {
              id
              author {
                id
                email
              }
            }
            postsCount
            roles
            magicAuthToken {
              isSet
            }
            magicAuthRedeemedAt
            magicAuthIssuedAt
          }
        }
      `,
      variables: {id: userFoo.id},
    })

    expect(data?.user.id).toBe(userFoo.id)
    expect(data?.user.name).toBe(userFoo.name)
    expect(data?.user.password.isSet).toBe(true)
    expect(data?.user.email).toBe(null)
    expect(data?.user.roles).toBe(null)
    expect(data?.user?.posts?.[0].author.id).toBe(userFoo.id)
    expect(data?.user?.posts?.[0].author.email).toBe(null)
  }))
})
