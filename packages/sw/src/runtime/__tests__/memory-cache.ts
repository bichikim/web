const getRequestUrl = (request: RequestInfo | URL): string => {
  if (typeof request === 'string') {
    return new URL(request, 'https://example.com').toString()
  }

  if (request instanceof URL) {
    return request.toString()
  }

  return request.url
}

export class MemoryCache implements Cache {
  readonly entries = new Map<string, Response>()

  async add(request: RequestInfo | URL): Promise<void> {
    const response = await fetch(request)

    await this.put(request, response)
  }

  async addAll(requests: RequestInfo[]): Promise<void> {
    await Promise.all(requests.map((request) => this.add(request)))
  }

  async delete(request: RequestInfo | URL): Promise<boolean> {
    return this.entries.delete(getRequestUrl(request))
  }

  async keys(request?: RequestInfo | URL): Promise<readonly Request[]> {
    if (request !== undefined) {
      const url = getRequestUrl(request)

      return this.entries.has(url) ? [new Request(url)] : []
    }

    return Array.from(this.entries.keys(), (url) => new Request(url))
  }

  async match(request: RequestInfo | URL): Promise<Response | undefined> {
    return this.entries.get(getRequestUrl(request))?.clone()
  }

  async matchAll(request?: RequestInfo | URL): Promise<readonly Response[]> {
    if (request !== undefined) {
      const response = await this.match(request)

      return response ? [response] : []
    }

    return Array.from(this.entries.values(), (response) => response.clone())
  }

  async put(request: RequestInfo | URL, response: Response): Promise<void> {
    this.entries.set(getRequestUrl(request), response.clone())
  }
}
