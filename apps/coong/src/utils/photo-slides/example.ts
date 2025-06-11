/**
 * Google Photos API OAuth 사용 예시
 * Example usage of Google Photos API with OAuth authentication
 */

import {createGooglePhotosTokenManager, GOOGLE_PHOTOS_SCOPES} from './oauth-helpers'
import {fetchSelectedAlbumPhotos, createAuthenticatedGooglePhotosClient} from './index'

/**
 * OAuth 설정 예시
 * 이 값들은 Google Cloud Console에서 OAuth 2.0 클라이언트를 생성한 후 얻을 수 있습니다.
 */
const OAUTH_CONFIG = {
  clientId: 'your-client-id.apps.googleusercontent.com',
  clientSecret: 'your-client-secret',
  redirectUri: 'http://localhost:3000/auth/callback', // 또는 배포된 앱의 콜백 URL
}

/**
 * 1단계: 사용자를 인증 페이지로 리다이렉트
 * Step 1: Redirect user to authorization page
 */
export function startOAuthFlow(): string {
  const tokenManager = createGooglePhotosTokenManager(
    OAUTH_CONFIG.clientId,
    OAUTH_CONFIG.clientSecret,
    OAUTH_CONFIG.redirectUri,
  )

  // CSRF 공격 방지를 위한 state 값 생성
  const state = crypto.randomUUID()

  // 사용자를 이 URL로 리다이렉트
  const authUrl = tokenManager.getAuthorizationUrl(state)

  console.log('사용자를 다음 URL로 리다이렉트하세요:', authUrl)
  return authUrl
}

/**
 * 2단계: 인증 콜백 처리
 * Step 2: Handle OAuth callback
 */
export async function handleOAuthCallback(authorizationCode: string): Promise<void> {
  const tokenManager = createGooglePhotosTokenManager(
    OAUTH_CONFIG.clientId,
    OAUTH_CONFIG.clientSecret,
    OAUTH_CONFIG.redirectUri,
  )

  try {
    await tokenManager.handleCallback(authorizationCode)
    console.log('OAuth 인증이 완료되었습니다!')
  } catch (error) {
    console.error('OAuth 콜백 처리 중 오류:', error)
  }
}

/**
 * 3단계: 구글 포토 API 사용
 * Step 3: Use Google Photos API
 */
export async function fetchPhotosFromAlbum(albumId: string): Promise<void> {
  try {
    // 자동으로 토큰을 관리하는 클라이언트 생성
    const client = await createAuthenticatedGooglePhotosClient(
      OAUTH_CONFIG.clientId,
      OAUTH_CONFIG.clientSecret,
      OAUTH_CONFIG.redirectUri,
    )

    if (!client) {
      console.log('인증이 필요합니다. startOAuthFlow()를 먼저 실행하세요.')
      return
    }

    // 앨범의 모든 사진 가져오기
    const photos = await client.fetchAllAlbumPhotos(albumId)
    console.log(`${photos.length}개의 사진을 찾았습니다:`)

    photos.forEach((photo, index) => {
      console.log(`${index + 1}. ${photo.filename} (${photo.id})`)
    })

  } catch (error) {
    console.error('사진을 가져오는 중 오류:', error)
  }
}

/**
 * 고급 사용법: TokenManager를 직접 사용
 * Advanced usage: Using TokenManager directly
 */
export class GooglePhotosService {
  private tokenManager: ReturnType<typeof createGooglePhotosTokenManager>

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.tokenManager = createGooglePhotosTokenManager(clientId, clientSecret, redirectUri)
  }

  /**
   * 인증 상태 확인
   */
  isAuthenticated(): boolean {
    return this.tokenManager.isAuthenticated()
  }

  /**
   * 로그인 URL 가져오기
   */
  getLoginUrl(state?: string): string {
    return this.tokenManager.getAuthorizationUrl(state)
  }

  /**
   * 콜백 처리
   */
  async handleCallback(code: string): Promise<void> {
    await this.tokenManager.handleCallback(code)
  }

  /**
   * 앨범 사진 가져오기
   */
  async getAlbumPhotos(albumId: string) {
    const accessToken = await this.tokenManager.getValidAccessToken()

    if (!accessToken) {
      throw new Error('인증이 필요합니다')
    }

    return fetchSelectedAlbumPhotos(accessToken, albumId)
  }

  /**
   * 로그아웃
   */
  async logout(): Promise<void> {
    await this.tokenManager.revokeCurrentToken()
  }
}

/**
 * 사용 예시
 * Usage example
 */
export async function exampleUsage(): Promise<void> {
  const service = new GooglePhotosService(
    OAUTH_CONFIG.clientId,
    OAUTH_CONFIG.clientSecret,
    OAUTH_CONFIG.redirectUri,
  )

  // 1. 인증 확인
  if (!service.isAuthenticated()) {
    console.log('로그인이 필요합니다:')
    console.log(service.getLoginUrl())
    return
  }

  // 2. 사진 가져오기 (실제 앨범 ID 필요)
  try {
    const albumId = 'your-album-id'
    const photos = await service.getAlbumPhotos(albumId)
    console.log(`${photos.length}개의 사진을 찾았습니다`)
  } catch (error) {
    console.error('오류:', error)
  }
}

/**
 * Web Framework에서의 사용 예시 (Express.js)
 * Example usage in a web framework (Express.js)
 */
export function expressExample() {
  // Express.js 라우터 예시
  const exampleRoutes = `
  // 로그인 시작
  app.get('/auth/google', (req, res) => {
    const authUrl = startOAuthFlow()
    res.redirect(authUrl)
  })

  // OAuth 콜백
  app.get('/auth/callback', async (req, res) => {
    const { code } = req.query
    await handleOAuthCallback(code as string)
    res.redirect('/dashboard')
  })

  // 사진 목록 조회
  app.get('/photos/:albumId', async (req, res) => {
    try {
      const photos = await fetchPhotosFromAlbum(req.params.albumId)
      res.json(photos)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })
  `

  console.log('Express.js 라우터 예시:', exampleRoutes)
}

/**
 * React/Solid.js에서의 사용 예시
 * Example usage in React/Solid.js
 */
export function reactExample() {
  const exampleComponent = `
  // OAuth 인증을 위한 React Hook
  function useGooglePhotosAuth() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [service] = useState(() => new GooglePhotosService(
      process.env.VITE_GOOGLE_CLIENT_ID,
      process.env.VITE_GOOGLE_CLIENT_SECRET,
      process.env.VITE_REDIRECT_URI
    ))

    useEffect(() => {
      setIsAuthenticated(service.isAuthenticated())
    }, [])

    const login = () => {
      window.location.href = service.getLoginUrl()
    }

    const logout = async () => {
      await service.logout()
      setIsAuthenticated(false)
    }

    return { isAuthenticated, login, logout, service }
  }

  // 컴포넌트에서 사용
  function PhotoGallery() {
    const { isAuthenticated, login, service } = useGooglePhotosAuth()
    const [photos, setPhotos] = useState([])

    const loadPhotos = async (albumId) => {
      try {
        const albumPhotos = await service.getAlbumPhotos(albumId)
        setPhotos(albumPhotos)
      } catch (error) {
        console.error('사진 로드 실패:', error)
      }
    }

    if (!isAuthenticated) {
      return <button onClick={login}>Google Photos로 로그인</button>
    }

    return (
      <div>
        <h1>내 사진들</h1>
        {photos.map(photo => (
          <img key={photo.id} src={photo.baseUrl + '=w400'} alt={photo.filename} />
        ))}
      </div>
    )
  }
  `

  console.log('React 컴포넌트 예시:', exampleComponent)
}

export default {
  startOAuthFlow,
  handleOAuthCallback,
  fetchPhotosFromAlbum,
  GooglePhotosService,
  exampleUsage,
  expressExample,
  reactExample,
}
