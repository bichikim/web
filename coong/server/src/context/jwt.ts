import {ContextFunction} from './types'
import {ExpressContext} from 'apollo-server-express'
import {freeze, PureObject} from '@winter-love/utils'
import * as jwt from 'jsonwebtoken'

export interface CreateWithJwtOptions {
  algorithm?: jwt.Algorithm
  expiresIn?: string | number
  key?: string
}

export const createWithJwt = (options: CreateWithJwtOptions = {}) => {
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
      jwt.sign(payload, key, {
        algorithm,
        expiresIn,
        ...options,
      }, (error, encoded) => {
        if (error) {
          return reject(error)
        }
        resolve(encoded ?? null)
      })
    })
  }

  const verify = (
    token: string,
    options?: jwt.VerifyOptions,
  ): Promise<jwt.JwtPayload | null> => {
    if (!key) {
      return Promise.resolve(null)
    }

    return new Promise((resolve) => {
      jwt.verify(token, key, {
        ...options,
      }, (error, decoded) => {
        if (error) {
          return resolve(null)
        }
        resolve(decoded ?? null)
      })
    })
  }

  return <ReturnType extends Record<string, unknown>>(contextFunction: ContextFunction<ReturnType>) => {

    return async (expressContext: ExpressContext) => {
      return freeze({
        ...await contextFunction(expressContext),
        jwt: freeze({
          sign,
          verify,
        }),
      })
    }
  }
}
