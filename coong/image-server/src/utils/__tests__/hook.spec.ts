import {useReq, withHook} from '../hook'
import flushPromises from 'flush-promises'

describe('hook', () => {
  it('should this', async () => {
    const send = jest.fn()
    const next = jest.fn()
    const run = withHook(() => {
      const req = useReq()
      return () => Promise.resolve(`hello, ${req.url}`)
    })

    run({url: 'req1'}, {send}, next)
    run({url: 'req2'}, {send}, next)
    await flushPromises()
    expect(send).toHaveBeenCalledWith('hello, req1')
    expect(send).toHaveBeenCalledWith('hello, req2')
  })
})
