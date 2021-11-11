import {useInfo} from '../'

describe('info', () => {
  const infoData = {
    description: 'hello',
    identifier: 'unknown',
    name: 'foo',
    playground: {args: ['foo']},
  }

  const info = useInfo()
  const target = {}
  info.set(target, {...infoData})

  afterEach(() => {
    info.set(target, {...infoData})
  })

  it('should get name', () => {
    expect(info.get(target)?.name).toBe('foo')
  })
})
