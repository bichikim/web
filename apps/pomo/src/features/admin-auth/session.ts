interface SignOutAdminSessionOptions {
  readonly origin: string
}

export const signOutAdminSession = async (
  options: SignOutAdminSessionOptions,
): Promise<boolean> => {
  const response = await fetch(new URL('/api/auth/sign-out', options.origin), {
    credentials: 'include',
    method: 'POST',
  })

  return response.ok
}
