import {permissions as rawPermissions} from '../roles'
import {
  createGetPermissions,
  createPermissions,
  flattenRoles,
  getMatchedPermission,
  getMatchedPermissionWithAll,
  getPermissionFromRoles,
  getTrueKeys,
  transformAllPermission,
} from '../utils'

describe('roles/utils', () => {
  const roles = {
    customer: {
      'privatePost.self': true,
      'privateUser.self': true,
      'publicPost.read': true,
      'publicPost.self': true,
      'publicPost.write': true,
      'publicUser.read': true,
    },
    master: {
      privatePost: true,
      privateUser: true,
      public: true,
    },
  }
  describe('getPermissionFromRoles', () => {
    it('should a', () => {
      const role = ['foo', 'bar', 'jhon']
      const map = {
        foo: ['f', 'o', 'o', '1'],
        jhon: ['j', 'h', 'o', 'n', '2'],
      }

      expect(getPermissionFromRoles(role, map)).toEqual([
        'f',
        'o',
        'o',
        '1',
        'j',
        'h',
        'o',
        'n',
        '2',
      ])
    })
  })

  describe('getTrueKeys', () => {
    it('should a', () => {
      const result = getTrueKeys({
        bar: false,
        foo: true,
        john: false,
      })
      expect(result).toEqual(['foo'])
    })
  })

  describe('flattenRoles', () => {
    it('should a', () => {
      const result = flattenRoles(roles)
      expect(result).toEqual({
        customer: [
          'privatePost.self',
          'privateUser.self',
          'publicPost.read',
          'publicPost.self',
          'publicPost.write',
          'publicUser.read',
        ],
        master: ['privatePost', 'privateUser', 'public'],
      })
    })
  })

  describe('createGetPermissions', () => {
    it('should a', () => {
      const getRoles = createGetPermissions({roles})

      const result = getRoles(['customer', 'public'])
      expect(result).toEqual([
        'privatePost.self',
        'privateUser.self',
        'publicPost.read',
        'publicPost.self',
        'publicPost.write',
        'publicUser.read',
        'public',
      ])
    })
  })
  describe('createPermissions', () => {
    it('should a', () => {
      const permissions = createPermissions(rawPermissions)
      expect(permissions.privateUser.all).toBe('privateUser.all')
    })
  })

  describe('getMatchedPermission', () => {
    it('should return permission with all', () => {
      const result = getMatchedPermission(['foo.update'], ['foo.create'])
      expect(result).toBe(undefined)
      const result2 = getMatchedPermission(['foo.update', 'foo.create'], ['foo.create'])
      expect(result2).toBe('foo.create')
    })
  })

  describe('getMatchedPermissionWithAll', () => {
    it('should return permission with all', () => {
      const result = getMatchedPermissionWithAll(
        ['foo.all'],
        ['foo.create'],
        ['create', 'update', 'read', 'delete'],
      )
      expect(result).toBe('foo.create')
    })
  })

  describe('transformAllPermission', () => {
    it('should a', () => {
      const result = transformAllPermission(['foo', 'john.all', 'bar.create'], ['create', 'read'])
      expect(result).toEqual(['foo.create', 'foo.read', 'john.create', 'john.read', 'bar.create'])
    })
  })
})
