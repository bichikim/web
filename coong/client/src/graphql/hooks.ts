import {useRequest} from 'boot/graphql-request'

export const useCryptoSignMessageQuery = {
  setup() {
    const request = useRequest()
    return request.cryptoSignMessage
  },
}

export const useAuthenticateUserWithCryptoSignature = {
  setup() {
    const request = useRequest()
    return request.authenticateUserWithCryptoSignature
  },
}
