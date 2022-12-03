import Axios from 'axios'
import {kakaoApiAccessToken, kakaoApiUrl, wavveApiAccessToken, wavveApiUrl} from 'src/env'

export const kokaoApi = Axios.create({
  baseURL: kakaoApiUrl(),
})

kokaoApi.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${kakaoApiAccessToken()}`
  }

  return config
})

export const wavveApi = Axios.create({
  baseURL: wavveApiUrl(),
})

wavveApi.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${wavveApiAccessToken()}`
  }
  return config
})
