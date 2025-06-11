/**
 * Google Photos API utilities for fetching album photos
 * Note: As of March 2025, Google Photos API only allows access to app-created content
 */

import {createGooglePhotosTokenManager} from './oauth-helpers'

/**
 * Google Photos API response types
 */
interface MediaItem {
  baseUrl: string
  contributorInfo?: {
    displayName: string
    profilePictureBaseUrl: string
  }
  description?: string
  filename: string
  id: string
  mediaMetadata: {
    creationTime: string
    height: string
    photo?: {
      apertureFNumber?: number
      cameraMake?: string
      cameraModel?: string
      exposureTime?: string
      focalLength?: number
      isoEquivalent?: number
    }
    video?: {
      fps?: number
      status?: string
    }
    width: string
  }
  mimeType: string
  productUrl: string
}

interface Album {
  coverPhotoBaseUrl?: string
  coverPhotoMediaItemId?: string
  id: string
  isWriteable: boolean
  mediaItemsCount: string
  productUrl: string
  title: string
}

interface SearchResponse {
  mediaItems: MediaItem[]
  nextPageToken?: string
}

interface AlbumsResponse {
  albums: Album[]
  nextPageToken?: string
}

/**
 * Configuration for Google Photos API client
 */
export interface GooglePhotosConfig {
  accessToken: string
  baseUrl?: string
}

/**
 * Options for fetching album photos
 */
export interface FetchAlbumPhotosOptions {
  pageSize?: number
  pageToken?: string
}

/**
 * Google Photos API client
 */
export class GooglePhotosClient {
  private accessToken: string
  private baseUrl: string

  constructor(config: GooglePhotosConfig) {
    this.accessToken = config.accessToken
    this.baseUrl = config.baseUrl || 'https://photoslibrary.googleapis.com/v1'
  }

  /**
   * Fetch all app-created albums
   */
  async fetchAlbums(options: FetchAlbumPhotosOptions = {}): Promise<AlbumsResponse> {
    const url = new URL(`${this.baseUrl}/albums`)

    if (options.pageSize) {
      url.searchParams.set('pageSize', options.pageSize.toString())
    }

    if (options.pageToken) {
      url.searchParams.set('pageToken', options.pageToken)
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch albums: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Fetch media items from a specific album
   * Note: Only works with app-created albums as of March 2025
   */
  async fetchAlbumPhotos(albumId: string, options: FetchAlbumPhotosOptions = {}): Promise<SearchResponse> {
    const url = `${this.baseUrl}/mediaItems:search`

    const requestBody = {
      albumId,
      pageSize: options.pageSize || 25,
      ...(options.pageToken && {pageToken: options.pageToken}),
    }

    const response = await fetch(url, {
      body: JSON.stringify(requestBody),
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch album photos: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Fetch all media items from an album with automatic pagination
   */
  async fetchAllAlbumPhotos(albumId: string): Promise<MediaItem[]> {
    const allMediaItems: MediaItem[] = []
    let nextPageToken: string | undefined

    do {
      // eslint-disable-next-line no-await-in-loop
      const response = await this.fetchAlbumPhotos(albumId, {
        pageSize: 100, // Maximum page size
        pageToken: nextPageToken,
      })

      allMediaItems.push(...response.mediaItems)
      nextPageToken = response.nextPageToken
    } while (nextPageToken)

    return allMediaItems
  }

  /**
   * Get album details by ID
   */
  async getAlbum(albumId: string): Promise<Album> {
    const url = `${this.baseUrl}/albums/${albumId}`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error(`Failed to get album: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get a media item with parameters for accessing the image
   * baseUrl expires after 60 minutes, so always fetch fresh when needed
   */
  getMediaItemUrl(
    baseUrl: string,
    options: {
      crop?: boolean
      height?: number
      width?: number
    } = {},
  ): string {
    const params = new URLSearchParams()

    if (options.width) {
      params.set('w', options.width.toString())
    }

    if (options.height) {
      params.set('h', options.height.toString())
    }

    if (options.crop) {
      params.set('c', 'true')
    }

    return `${baseUrl}${params.toString() ? `=${params.toString()}` : ''}`
  }
}

/**
 * Utility function to create a Google Photos client
 */
export function createGooglePhotosClient(accessToken: string): GooglePhotosClient {
  return new GooglePhotosClient({accessToken})
}

/**
 * Create Google Photos client with automatic token management
 * 자동 토큰 관리를 포함한 구글 포토 클라이언트 생성
 */
export async function createAuthenticatedGooglePhotosClient(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<GooglePhotosClient | null> {
  const tokenManager = createGooglePhotosTokenManager(clientId, clientSecret, redirectUri)
  const accessToken = await tokenManager.getValidAccessToken()

  if (!accessToken) {
    console.warn('No valid access token available. User needs to authenticate.')
    return null
  }

  return createGooglePhotosClient(accessToken)
}

/**
 * High-level function to fetch photos from a selected album
 * Usage example:
 *
 * ```typescript
 * const photos = await fetchSelectedAlbumPhotos(accessToken, albumId)
 * ```
 */
export async function fetchSelectedAlbumPhotos(accessToken: string, albumId: string): Promise<MediaItem[]> {
  const client = createGooglePhotosClient(accessToken)

  return client.fetchAllAlbumPhotos(albumId)
}

/**
 * Fetch all available albums
 */
export async function fetchAvailableAlbums(accessToken: string): Promise<Album[]> {
  const client = createGooglePhotosClient(accessToken)
  const allAlbums: Album[] = []
  let nextPageToken: string | undefined

  do {
    // eslint-disable-next-line no-await-in-loop
    const response = await client.fetchAlbums({
      pageSize: 50, // Maximum page size for albums
      pageToken: nextPageToken,
    })

    allAlbums.push(...response.albums)
    nextPageToken = response.nextPageToken
  } while (nextPageToken)

  return allAlbums
}

/**
 * Get album details with photo count
 */
export async function getAlbumDetails(accessToken: string, albumId: string): Promise<Album> {
  const client = createGooglePhotosClient(accessToken)

  return client.getAlbum(albumId)
}

export type {MediaItem, Album, SearchResponse, AlbumsResponse}
