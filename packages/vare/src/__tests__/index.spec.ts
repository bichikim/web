import {state, mutate, compute, computeRef, act} from 'src/'

describe('index', () => {
  it('should have all members', () => {
    expect(typeof state).toBe('function')
    expect(typeof mutate).toBe('function')
    expect(typeof compute).toBe('function')
    expect(typeof computeRef).toBe('function')
    expect(typeof act).toBe('function')
  })
})
