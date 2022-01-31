import {hasRole} from '../has-role'
import {createFakeAuthArgs} from './create-fake-auth-args'

describe('has-roles', () => {
  it('should return true with having the role', () => {
    const args = createFakeAuthArgs()
    args.session.data.roles = ['foo', 'bar']
    const result = hasRole('foo')(args)
    expect(result).toBe(true)
  })
  it('should return false without having the john', () => {
    const args = createFakeAuthArgs()
    args.session.data.roles = ['foo', 'bar']
    const result = hasRole('john')(args)
    expect(result).toBe(false)
  })
})
