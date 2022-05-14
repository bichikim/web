import {BaseListTypeInfo, MaybePromise} from '@keystone-6/core/types'

export interface SessionData {
  isAdmin: boolean
  name: string
  roles: string[]
}

export interface Session {
  data: SessionData
  itemId: string
  listKey: string
}

export interface AuthArgs<ListTypeInfo extends BaseListTypeInfo = any> {
  fieldKey?: string
  inputData?: any
  item?: ListTypeInfo['item']
  operation: string | 'delete'
  session: Session
}

export type FilterOutput<ListTypeInfo extends BaseListTypeInfo = BaseListTypeInfo> =
  boolean | ListTypeInfo['inputs']['where']

export type AuthChecker<ListTypeInfo extends BaseListTypeInfo> =
  (args: AuthArgs<ListTypeInfo>) => MaybePromise<boolean>

export type FilterAuthChecker<ListTypeInfo extends BaseListTypeInfo> =
  (args: AuthArgs<ListTypeInfo>) => MaybePromise<FilterOutput>
