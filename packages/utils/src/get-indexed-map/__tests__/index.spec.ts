import {getIndexedMap} from '../'

describe('getIndexedMap', () => {
  it('should return indexed map', () => {
    expect(
      getIndexedMap(
        [
          {id: '12', name: 'foo'},
          {id: '13', name: 'bar'},
        ],
        ['id'],
      ),
    ).toEqual(
      new Map([
        ['12', {id: '12', name: 'foo'}],
        ['13', {id: '13', name: 'bar'}],
      ]),
    )
  })
})
