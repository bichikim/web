import {findAtom} from '../find-atom'
import {atom} from 'src/atom'

describe('find-atom', () => {
  it('should return atoms', () => {
    const result = findAtom(atom({
      foo: atom({
        bar: 'bar',
        john: atom({
          name: 'john',
        }),
      }),
    }))

    expect(result).toMatchSnapshot()
  })
})
