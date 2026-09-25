interface Account {
  readonly id: string
}

declare const requestAccount: () => Promise<Account>

export const loadAccount = async (): Promise<Account | undefined> => {
  try {
    return await requestAccount()
  } catch {
    return undefined
  }
}
