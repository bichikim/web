import {apiFetch} from '../http-client'

export const signOutAdminSession = async (): Promise<boolean> => {
  const response = await apiFetch('auth/sign-out', {
    credentials: 'include',
    method: 'POST',
  })

  return response.ok
}
