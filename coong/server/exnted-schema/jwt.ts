import {sign as jwtSign} from 'jsonwebtoken'

export interface SignJwtOptions {
  expiresIn?: number
}

export interface Jwt {
  sign: (payload: Record<string, any>, options?: SignJwtOptions) => string
}

export const createJwt = (privateKey: string): Jwt => {
  const sign = (payload: Record<string, any>, options: SignJwtOptions = {}) => {
    const {expiresIn = '1m'} = options
    return jwtSign(payload, privateKey, {
      expiresIn,
    })
  }
  return {
    sign,
  }
}
