import {wavveApi} from './apis'
import {useQuery} from '@tanstack/vue-query'

export const getMock = async () => {
  // https://apis.wavve.com/v1/multiband/GN51

  const response = await wavveApi.get('/v1/multiband/GN51')

  return response.data
}

export const useGetMock = () => {
  return useQuery(['get-mock'], () => getMock())
}
