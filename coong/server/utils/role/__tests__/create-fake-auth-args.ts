import {AuthArgs} from '../types'

export const createFakeAuthArgs = (): AuthArgs => {
  return {
    operation: 'create',
    session: {
      data: {
        isAdmin: false,
        name: 'foo',
        roles: ['foo'],
      },
      itemId: '1111',
      listKey: 'User',
    },
  }
}
