import {createSupabase} from 'src/utils/supabase'
import {query} from '@solidjs/router'

export const AUTH_QUERY_KEY = 'auth'

export const fetchUser = async () => {
  // server and client side both use this query
  // 토큰에서 유저 정보를 가져오는 용도 이기 때문에 client side에서도 사용할 수 있도록 함
  const supabase = createSupabase()

  const {
    data: {user},
  } = await supabase.auth.getUser()

  return user
}

export const userQuery = query(fetchUser, 'auth/user')
