
export const defaultAllActions = {
  create: true,
  read: true,
  self: true,
  update: true,
}

export enum Algorithm {
  AND = 'AND',
  OR = 'OR'
}

export interface IsMatchOptions<ActionNames extends string> {
  /**
   * @default OR
   */
  algorithm?: Algorithm
  /**
   * @default defaultAllActions
   */
  allActions?: Record<ActionNames, boolean>
}

export const isMatch = <RoleNames extends string, ActionNames extends string = string>(
  requiredRoles: Record<RoleNames, Record<ActionNames, boolean> | boolean>,
  userRoles: Partial<Record<RoleNames, Partial<Record<ActionNames, boolean>> | boolean>>,
  options: IsMatchOptions<ActionNames> = {},
) => {
  const {allActions = defaultAllActions, algorithm = Algorithm.OR} = options
  return Object.keys(requiredRoles).reduce((result, kind) => {

    const userRole = userRoles[kind]

    if (!userRole) {
      return result
    }

    const requireRole = requiredRoles[kind]

    const matches = Object.keys(
      requireRole === true ? allActions : requireRole,
    ).filter((action) => {
      // passing all
      if (userRole === true) {
        return true
      }
      return Boolean(userRole[action])
    })

    if (matches.length > 0) {
      result.pass = true
      if (!result.isSelf) {
        result.isSelf = matches.includes('self')
      }
      result.match[kind] = Object.fromEntries(matches.map((key) => [key, true]))
    }

    return result
  }, {
    isSelf: false,
    match: {} as Record<string, any>,
    pass: false,
  })
}
