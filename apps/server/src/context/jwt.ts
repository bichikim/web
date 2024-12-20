import {PureObject} from '@winter-love/utils'
import * as jwt from 'jsonwebtoken'

export interface CreateWithJwtOptions {
  algorithm?: jwt.Algorithm
  expiresIn?: string | number
  key?: string
}

export interface JwtContext {
  sign: (
    payload: PureObject | string | Buffer,
    options?: jwt.SignOptions,
  ) => Promise<string | null>
  verify: (
    token: string,
    options?: jwt.VerifyOptions,
  ) => Promise<jwt.JwtPayload | string | undefined>
}

export const prepareJwt = (options: CreateWithJwtOptions = {}): (() => JwtContext) => {
  const {key, algorithm = 'HS384', expiresIn = '2h'} = options

  if (!key) {
    console.warn('Jwt key is not provided')
  }

  const sign = (
    payload: PureObject | string | Buffer,
    options: jwt.SignOptions = {},
  ): Promise<string | null> => {
    if (!key) {
      return Promise.resolve(null)
    }

    return new Promise((resolve, reject) => {
      jwt.sign(
        payload,
        key,
        {
          algorithm,
          expiresIn,
          ...options,
        },
        (error, encoded) => {
          if (error) {
            return reject(error)
          }
          resolve(encoded ?? null)
        },
      )
    })
  }

  const verify = (
    token: string,
    options?: jwt.VerifyOptions,
  ): Promise<jwt.JwtPayload | string | undefined> => {
    if (!key) {
      return Promise.reject(new Error('jwt has a no key'))
    }

    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        key,
        {
          ...options,
        },
        (error, decoded) => {
          if (error) {
            return reject(error)
          }
          resolve(decoded)
        },
      )
    })
  }

  return () => ({
    sign,
    verify,
  })
}
