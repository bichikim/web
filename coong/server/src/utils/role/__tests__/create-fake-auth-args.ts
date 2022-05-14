import {AuthArgs} from '#utils'

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
