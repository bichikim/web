// noinspection JSUnusedLocalSymbols

import {setupTestRunner} from '@keystone-6/core/testing'
import config from '../keystone'
import {gql} from 'graphql-tag'

const runner = setupTestRunner({config})

describe('coong/server/user-query', () => {
  it('should protect user data', runner(async ({context}) => {
    // 유저 Foo 생성
    const userFoo = await context.query.User.createOne({
      data: {email: 'foo@foo.com', name: 'foo', password: 'super-secret'},
      query: 'id name password { isSet }',
    })

    expect(userFoo.name).toBe('foo')

    // 유저 Bar 생성
    const userBar = await context.query.User.createOne({
      data: {email: 'bar@bar.com', name: 'bar', password: 'super-secret'},
      query: 'id name password { isSet }',
    })

    // 유저 Foo Post 생성
    const {data: postData, errors: postError} = await context.withSession({
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

    // console.log(postData)
    // console.log(postError)

    const postId = postData?.createPost?.id

    //// 읽기 테스트

    // 비인증 유저검색
    const {data, errors} = await context.graphql.raw({
      query: gql`
        query ($id: ID!) {
          user(where: {id: $id}) {
            id
            name,
            email
            password {
              isSet
            }
            follower {
              email
              id
              name
              password {
                isSet
              }
              roles
            }
            roles
            posts {
              id
              author {
                id
                email
              }
            }
            postLikesCount
          }
        }
      `,
      variables: {id: userFoo.id},
    })

    // console.log(data?.user)
    // console.log(data?.user?.posts)
    // console.log(data?.user?.posts?.[0].author)

    expect(data?.user.id).toBe(userFoo.id)
    expect(data?.user.name).toBe(userFoo.name)
    expect(data?.user.password.isSet).toBe(true)
    expect(data?.user.email).toBe(null)
    expect(data?.user.roles).toBe(null)
    expect(data?.user?.posts?.[0].author.id).toBe(userFoo.id)
    expect(data?.user?.posts?.[0].author.email).toBe(null)
  }))
})
