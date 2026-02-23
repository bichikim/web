const BMC_API_BASE = 'https://developers.buymeacoffee.com/api/v1'

export interface BmcSupporterResponse {
  current_page?: number
  data?: unknown[]
  last_page?: number
  per_page?: number
  total?: number
}

/**
 * Fetch supporters from Buy Me a Coffee API
 */
export const fetchSupporters = async (accessToken: string, page = 1): Promise<BmcSupporterResponse> => {
  const url = `${BMC_API_BASE}/supporters?page=${page}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`BMC API error: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<BmcSupporterResponse>
}
