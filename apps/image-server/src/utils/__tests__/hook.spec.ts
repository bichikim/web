import flushPromises from 'flush-promises'
import {useReq as useRequest, withHook} from '../hook'

describe('hook', () => {
  it('should this', async () => {
    const send = jest.fn()
    const next = jest.fn()
    const run = withHook(() => {
      const request = useRequest()
      return () => Promise.resolve(`hello, ${request.url}`)
    })

    run({url: 'req1'}, {send}, next)
    run({url: 'req2'}, {send}, next)
    await flushPromises()
    expect(send).toHaveBeenCalledWith('hello, req1')
    expect(send).toHaveBeenCalledWith('hello, req2')
  })
})
