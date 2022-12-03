// 모든 evn 타입 정의는 /types/env.d.ts 에 있습니다

export const wavveApiUrl = () => {
  return import.meta.env.VITE_WAVVE_API_URL ?? 'https://apis.wavve.com'
}

export const kakaoApiUrl = () => {
  return import.meta.env.VITE_KAKAO_API_URL ?? 'https://apis.kokao.com'
}

export const kakaoApiAccessToken = () => {
  return import.meta.env.VITE_KAKAO_API_ACCESS_TOKEN ?? ''
}

export const wavveApiAccessToken = () => {
  return import.meta.env.VITE_WAVVE_API_ACCESS_TOKEN ?? ''
}
