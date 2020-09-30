import {expect} from 'chai'
import uid from '../index'

describe('uid', function test() {
  it('should return uid', function test() {
    const a = uid()
    const b = uid()

    expect(a).not.to.equal(b)
  })
})
