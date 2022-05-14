import {AuthArgs, isSelfField} from '#utils'

describe('is-self-filter', () => {
  interface Item {
    all: any
    fields: 'id' | 'name'
    inputs: any
    item: any
    key: 'Item'
  }

  const mockArgs: AuthArgs<Item> = {
    item: {
      id: 'my-id',
      name: 'foo',
    },
    operation: 'read',
    session: {
      data: {
        isAdmin: false,
        name: 'foo',
        roles: [],
      },
      itemId: 'my-id',
      listKey: '',
    },
  }

  const errorMockArgs: AuthArgs<Item> = {
    item: {
      id: 'my-id',
      name: 'foo',
    },
    operation: 'read',
    session: {
      data: {
        isAdmin: false,
        name: 'foo',
        roles: [],
      },
      itemId: 'not-my-id',
      listKey: '',
    },
  }

  it('should check self item and return true', () => {
    const result = isSelfField((item) => item?.id)(mockArgs)
    expect(result).toBe(true)
  })

  it('should check self item and return false', () => {
    const result = isSelfField((item) => item?.id)(errorMockArgs)
    expect(result).toBe(false)
  })
})
