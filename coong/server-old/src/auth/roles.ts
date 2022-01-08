
export const roles = {
  customer: {
    'privatePost.self': true,
    'privateUser.self': true,
    'publicPost.read': true,
    'publicPost.self': true,
  },
  master: {
    privatePost: true,
    privateUser: true,
    public: true,
  },
}

export type ActionKeys = 'create' | 'delete' | 'read' | 'self' | 'update' | 'all'

export const actions: Actions<ActionKeys> = {

  all: true,

  create: true,

  delete: true,

  read: true,
  /**
   * 본인 것을 read, edit, write, remove 있는지 여부
   * 이 것으로 통과한 경우 context.auth 에 checkAuthorId: xxx 가 적혀집니다.
   */
  self: true,
  update: true,
}

export type Actions<K extends string> = Record<K, boolean>

export type PermissionKeys = 'privatePost' | 'privateUser' | 'publicPost' | 'publicUser'

export type Permissions<K extends string, A extends string> = Record<K, Record<keyof Actions<A>, boolean>>

export const permissions: Permissions<PermissionKeys, ActionKeys> = {
  privatePost: actions,
  privateUser: actions,
  publicPost: actions,
  publicUser: actions,
}

