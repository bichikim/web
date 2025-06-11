/**
 * Google Photos API OAuth 2.0 helpers
 * 구글 포토 API를 위한 OAuth 2.0 인증 헬퍼들
 */

/**
 * Google OAuth 2.0 configuration
 */
export interface GoogleOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

/**
 * OAuth 2.0 token response
 */
export interface TokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope: string
  token_type: string
}

/**
 * Token data with issued timestamp
 */
export interface TokenData extends TokenResponse {
  issuedAt: number
}

/**
 * Required scopes for Google Photos API
 * 2025년 3월 이후에는 앱이 생성한 콘텐츠만 접근 가능
 */
export const GOOGLE_PHOTOS_SCOPES = {
  // 미디어 아이템과 앨범 생성 (append only)
  APPEND_ONLY: 'https://www.googleapis.com/auth/photoslibrary.appendonly',

  // 앱이 생성한 미디어 아이템과 앨범 편집 접근
  EDIT_APP_CREATED: 'https://www.googleapis.com/auth/photoslibrary.edit.appcreateddata',

  // 앱이 생성한 미디어 아이템과 앨범 읽기 전용 접근
  READONLY_APP_CREATED: 'https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata',
} as const

/**
 * Google OAuth 2.0 endpoints
 */
const GOOGLE_OAUTH_ENDPOINTS = {
  AUTHORIZATION: 'https://accounts.google.com/o/oauth2/v2/auth',
  REVOKE: 'https://oauth2.googleapis.com/revoke',
  TOKEN: 'https://oauth2.googleapis.com/token',
} as const

/**
 * Generate authorization URL for OAuth 2.0 flow
 * 사용자를 구글 인증 페이지로 리다이렉트할 URL 생성
 *
 * @param config OAuth configuration
 * @param state CSRF protection을 위한 state 값
 * @returns Authorization URL
 */
export function generateAuthorizationUrl(config: GoogleOAuthConfig, state?: string): string {
  /* eslint-disable camelcase */
  const params = new URLSearchParams({
    access_type: 'offline',
    client_id: config.clientId,
    // refresh token을 받기 위해 필수
    include_granted_scopes: 'true',

    // incremental authorization
    prompt: 'consent',

    redirect_uri: config.redirectUri,

    response_type: 'code',
    scope: config.scopes.join(' '), // 매번 동의 화면 표시
  })
  /* eslint-enable camelcase */

  if (state) {
    params.set('state', state)
  }

  return `${GOOGLE_OAUTH_ENDPOINTS.AUTHORIZATION}?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 * 인증 코드를 액세스 토큰으로 교환
 *
 * @param config OAuth configuration
 * @param authorizationCode Authorization code from callback
 * @returns Token response
 */
export async function exchangeCodeForToken(
  config: GoogleOAuthConfig,
  authorizationCode: string,
): Promise<TokenResponse> {
  /* eslint-disable camelcase */
  const response = await fetch(GOOGLE_OAUTH_ENDPOINTS.TOKEN, {
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: authorizationCode,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  })
  /* eslint-enable camelcase */

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code for token: ${response.status} ${error}`)
  }

  return response.json()
}

/**
 * Refresh access token using refresh token
 * 리프레시 토큰을 사용해서 액세스 토큰 갱신
 *
 * @param config OAuth configuration
 * @param refreshToken Refresh token
 * @returns New token response
 */
export async function refreshAccessToken(config: GoogleOAuthConfig, refreshToken: string): Promise<TokenResponse> {
  /* eslint-disable camelcase */
  const response = await fetch(GOOGLE_OAUTH_ENDPOINTS.TOKEN, {
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  })
  /* eslint-enable camelcase */

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh token: ${response.status} ${error}`)
  }

  return response.json()
}

/**
 * Revoke access token
 * 액세스 토큰 폐기
 *
 * @param accessToken Access token to revoke
 */
export async function revokeToken(accessToken: string): Promise<void> {
  const response = await fetch(GOOGLE_OAUTH_ENDPOINTS.REVOKE, {
    body: new URLSearchParams({
      token: accessToken,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to revoke token: ${response.status} ${error}`)
  }
}

/**
 * Check if token is expired
 * 토큰 만료 여부 확인
 *
 * @param tokenData Token response with timestamp
 * @param gracePeriodMinutes Grace period in minutes (default: 5)
 * @returns true if token is expired or will expire soon
 */
export function isTokenExpired(tokenData: TokenData, gracePeriodMinutes: number = 5): boolean {
  const now = Date.now() / 1000 // Convert to seconds
  const expiresAt = tokenData.issuedAt + tokenData.expires_in
  const gracePeriodSeconds = gracePeriodMinutes * 60

  return now >= expiresAt - gracePeriodSeconds
}

/**
 * Create token data with issued timestamp
 * 토큰 데이터에 발급 시간 추가
 */
export function createTokenData(tokenResponse: TokenResponse): TokenData {
  return {
    ...tokenResponse,
    issuedAt: Math.floor(Date.now() / 1000),
  }
}

/**
 * Storage interface for token persistence
 * 토큰 저장을 위한 인터페이스
 */
export interface TokenStorage {
  getItem: (key: string) => string | null
  removeItem: (key: string) => void
  setItem: (key: string, value: string) => void
}

/**
 * Default localStorage implementation
 * 기본 localStorage 구현
 */
export const defaultStorage: TokenStorage = {
  getItem: (key: string) => {
    if (typeof localStorage === 'undefined') {
      return null
    }

    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  removeItem: (key: string) => {
    if (typeof localStorage === 'undefined') {
      return
    }

    try {
      localStorage.removeItem(key)
    } catch {
      // Ignore storage errors
    }
  },
  setItem: (key: string, value: string) => {
    if (typeof localStorage === 'undefined') {
      return
    }

    try {
      localStorage.setItem(key, value)
    } catch {
      // Ignore storage errors
    }
  },
}

/**
 * Load token from storage
 * 스토리지에서 토큰 로드
 */
export function loadTokenFromStorage(storageKey: string, storage: TokenStorage = defaultStorage): TokenData | null {
  try {
    const stored = storage.getItem(storageKey)

    if (!stored) {
      return null
    }

    return JSON.parse(stored)
  } catch {
    return null
  }
}

/**
 * Save token to storage
 * 스토리지에 토큰 저장
 */
export function saveTokenToStorage(
  tokenData: TokenData,
  storageKey: string,
  storage: TokenStorage = defaultStorage,
): void {
  try {
    storage.setItem(storageKey, JSON.stringify(tokenData))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear token from storage
 * 스토리지에서 토큰 삭제
 */
export function clearTokenFromStorage(storageKey: string, storage: TokenStorage = defaultStorage): void {
  try {
    storage.removeItem(storageKey)
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get valid access token, refreshing if necessary
 * 유효한 액세스 토큰 가져오기 (필요시 갱신)
 *
 * @param config OAuth configuration
 * @param storageKey Storage key for token
 * @param storage Storage implementation
 * @returns Valid access token or null if authentication needed
 */
export async function getValidAccessToken(
  config: GoogleOAuthConfig,
  storageKey: string = 'google_photos_token',
  storage: TokenStorage = defaultStorage,
): Promise<string | null> {
  const tokenData = loadTokenFromStorage(storageKey, storage)

  if (!tokenData) {
    return null
  }

  // Check if token needs refresh
  if (isTokenExpired(tokenData)) {
    if (!tokenData.refresh_token) {
      // No refresh token available, need to re-authorize
      clearTokenFromStorage(storageKey, storage)

      return null
    }

    try {
      const newToken = await refreshAccessToken(config, tokenData.refresh_token)

      /* eslint-disable camelcase */
      const newTokenData = createTokenData({
        ...newToken,
        refresh_token: newToken.refresh_token || tokenData.refresh_token, // Keep existing refresh token if not provided
      })

      /* eslint-enable camelcase */
      saveTokenToStorage(newTokenData, storageKey, storage)

      return newTokenData.access_token
    } catch {
      clearTokenFromStorage(storageKey, storage)

      return null
    }
  }

  return tokenData.access_token
}

/**
 * Check if user is authenticated
 * 사용자 인증 상태 확인
 */
export function isAuthenticated(
  storageKey: string = 'google_photos_token',
  storage: TokenStorage = defaultStorage,
): boolean {
  const tokenData = loadTokenFromStorage(storageKey, storage)

  return tokenData !== null && !isTokenExpired(tokenData, 0)
}

/**
 * Handle OAuth callback by exchanging code for tokens
 * OAuth 콜백 처리 - 코드를 토큰으로 교환
 */
export async function handleOAuthCallback(
  config: GoogleOAuthConfig,
  authorizationCode: string,
  storageKey: string = 'google_photos_token',
  storage: TokenStorage = defaultStorage,
): Promise<TokenData> {
  const tokenResponse = await exchangeCodeForToken(config, authorizationCode)
  const tokenData = createTokenData(tokenResponse)

  saveTokenToStorage(tokenData, storageKey, storage)

  return tokenData
}

/**
 * Revoke current token and clear storage
 * 현재 토큰 폐기 및 스토리지 삭제
 */
export async function revokeCurrentToken(
  storageKey: string = 'google_photos_token',
  storage: TokenStorage = defaultStorage,
): Promise<void> {
  const tokenData = loadTokenFromStorage(storageKey, storage)

  if (tokenData?.access_token) {
    await revokeToken(tokenData.access_token)
  }

  clearTokenFromStorage(storageKey, storage)
}

/**
 * Create a pre-configured Google Photos token manager functions
 * 구글 포토용 미리 설정된 토큰 관리 함수들 생성
 */
export function createGooglePhotosTokenManager(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  storageKey: string = 'google_photos_token',
) {
  const config: GoogleOAuthConfig = {
    clientId,
    clientSecret,
    redirectUri,
    scopes: [
      GOOGLE_PHOTOS_SCOPES.READONLY_APP_CREATED,
      GOOGLE_PHOTOS_SCOPES.EDIT_APP_CREATED,
      GOOGLE_PHOTOS_SCOPES.APPEND_ONLY,
    ],
  }

  return {
    clearToken: () => clearTokenFromStorage(storageKey),
    getAuthorizationUrl: (state?: string) => generateAuthorizationUrl(config, state),
    getValidAccessToken: () => getValidAccessToken(config, storageKey),
    handleCallback: (authorizationCode: string) => handleOAuthCallback(config, authorizationCode, storageKey),
    isAuthenticated: () => isAuthenticated(storageKey),
    revokeToken: () => revokeCurrentToken(storageKey),
  }
}
