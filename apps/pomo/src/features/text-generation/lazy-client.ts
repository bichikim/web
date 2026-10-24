export interface DisposableClient {
  readonly dispose: () => void
}

export interface LazyClient<Client extends DisposableClient> {
  readonly dispose: () => void
  readonly get: () => Client
}

/** Lazily owns one disposable client and clears it after disposal. */
export const createLazyClient = <Client extends DisposableClient>(
  createClient: () => Client,
): LazyClient<Client> => {
  let client: Client | null = null

  return {
    dispose: () => {
      client?.dispose()
      client = null
    },
    get: () => {
      client ??= createClient()
      return client
    },
  }
}
