export const permissionRoles = {
  customer: {
    'privateUser:self': true,
    'publicUser:read': true,
    'publicPost:self': true,
    'publicPost:read': true,
    'publicPost:write': true,
    'privatePost:self': true,
  },
  master: {
    'privateUser': true,
    'public': true,
    'privatePost': true,
  }
}

export const rolesActions = {
  /**
   * 본인 것을 read, edit, write, remove 있는지 여부
   */
  self: true,
  read: true,
  update: true,
  create: true,
  delete: true,
}

export const rolesParts = {
  privateUser: rolesActions,
  publicUser: rolesActions,
  publicPost: rolesActions,
  privatePost: rolesActions,
}

export const specialRoles = {
  /**
   * 이 것으로 통과한 경우 context.auth 에 checkAuthorId: xxx 가 적혀집니다.
   */
  allowSelf: true,
  notAllow: true,
}
