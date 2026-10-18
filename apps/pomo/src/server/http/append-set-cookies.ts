export const appendSetCookies = (headers: Headers, cookies: ReadonlyArray<string>): void => {
  for (const cookie of cookies) {
    headers.append('Set-Cookie', cookie)
  }
}
