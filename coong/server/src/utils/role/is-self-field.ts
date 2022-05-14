import {BaseListTypeInfo} from '@keystone-6/core/types'
import {AuthArgs} from 'utils/role/types'

export const isSelfField = <ListTypeInfo extends BaseListTypeInfo = any>(
  getUserId: (item: ListTypeInfo['item']) => any,
) => (
    args: AuthArgs<ListTypeInfo>,
  ) => {
    const {session, item} = args
    return getUserId(item as any) === session.itemId
  }
