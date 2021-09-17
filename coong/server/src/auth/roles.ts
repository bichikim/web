export const permissionRoles = {
  customer: {
    'privatePost:self': true,
    'privateUser:self': true,
    'publicPost:read': true,
    'publicPost:self': true,
    'publicPost:write': true,
    'publicUser:read': true,
  },
  master: {
    privatePost: true,
    privateUser: true,
    public: true,
  },
}

export const rolesActions = {

  create: true,

  delete: true,

  read: true,
  /**
   * 본인 것을 read, edit, write, remove 있는지 여부
   */
  self: true,
  update: true,
}

export const rolesParts = {
  privatePost: rolesActions,
  privateUser: rolesActions,
  publicPost: rolesActions,
  publicUser: rolesActions,
}

export const specialRoles = {
  /**
   * 이 것으로 통과한 경우 context.auth 에 checkAuthorId: xxx 가 적혀집니다.
   */
  allowSelf: true,
  notAllow: true,
}
