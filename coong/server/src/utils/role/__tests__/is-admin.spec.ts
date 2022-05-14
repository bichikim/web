import {isAdmin} from '#utils'
import {createFakeAuthArgs} from './create-fake-auth-args'

describe('isAdmin', () => {
  it('should return true with Admin', () => {
    const args = createFakeAuthArgs()
    args.session.data.isAdmin = true
    const result = isAdmin(args)
    expect(result).toBe(true)
  })
  it('should return false with no Admin', () => {
    const args = createFakeAuthArgs()
    args.session.data.isAdmin = false
    const result = isAdmin(args)
    expect(result).toBe(false)
  })
})
