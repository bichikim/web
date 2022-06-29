import {Jwt, JwtPayload, sign, SignOptions, verify, VerifyOptions} from 'jsonwebtoken'

export interface JwtContext {
  sign: (
    payload: Record<string, any>,
    options?: Partial<SignOptions>,
    privateKey?: string,
  ) => Promise<string | undefined>
  verify: (
    payload: string,
    options?: VerifyOptions,
    privateKey?: string,
  ) => Promise<string | Jwt | JwtPayload | undefined>
}

const jwtSign = (
  payload: Record<string, any>,
  privateKey: string,
  options: Partial<SignOptions> = {},
) => {
  return new Promise<string | undefined>((resolve, reject) => {
    sign(payload, privateKey, options, (error, encoded) => {
      if (error) {
        reject(error)
        return
      }
      resolve(encoded)
    })
  })
}

const jwtVerify = (token: string, privateKey: string, options: VerifyOptions = {}) => {
  return new Promise<string | Jwt | JwtPayload | undefined>((resolve, reject) => {
    verify(token, privateKey, options, (error, decoded) => {
      if (error) {
        reject(error)
        return
      }
      resolve(decoded)
    })
  })
}

export const createJwt = (privateKey: string): JwtContext => {
  const sign = (
    payload: Record<string, any>,
    options?: Partial<SignOptions>,
    _privateKey?: string,
  ) => {
    const {expiresIn = '1m', ...rest} = options ?? {}
    return jwtSign(payload, _privateKey ?? privateKey, {
      ...rest,
      expiresIn,
    })
  }

  const verify = (token: string, options?: VerifyOptions, _privateKey?: string) => {
    return jwtVerify(token, _privateKey ?? privateKey, options)
  }
  return {
    sign,
    verify,
  }
}
