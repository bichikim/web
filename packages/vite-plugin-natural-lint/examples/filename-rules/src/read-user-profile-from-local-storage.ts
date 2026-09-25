export const readUserProfileFromLocalStorage = (): string | null =>
  globalThis.localStorage.getItem('user-profile')
