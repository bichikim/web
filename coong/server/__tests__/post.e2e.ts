import {setupTestRunner} from '@keystone-6/core/testing'
import config from '../keystone'

const runner = setupTestRunner({config})

describe('coong/server/post', () => {
  it('should run post', runner(async (args) => {
    const posts = await args.context.query.Post.count()
    expect(posts).toBe(0)
  }))
})
