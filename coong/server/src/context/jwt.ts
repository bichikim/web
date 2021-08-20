import {ContextFunction} from './types'
import {ExpressContext} from 'apollo-server-express'
import {freeze, PureObject} from '@winter-love/utils'
import * as jwt from 'jsonwebtoken'

export interface CreateWithJwtOptions {
  key?: string
}

export const createWithJwt = (options: CreateWithJwtOptions = {}) => {
  const {key} = options

  const sign = (
    payload: PureObject | string | Buffer,
    options: jwt.SignOptions = {},
  ): Promise<string | null> => {
    if (!key) {
      return Promise.resolve(null)
    }

    return new Promise((resolve, reject) => {
      jwt.sign(payload, key, options, (error, encoded) => {
        if (error) {
          return reject(error)
        }
        resolve(encoded ?? null)
      })
    })
  }

  const verify = (
    token: string,
    secretOrPublicKey: jwt.Secret | jwt.GetPublicKeyOrSecret,
    options?: jwt.VerifyOptions,
  ): Promise<jwt.JwtPayload | null> => {
    if (!key) {
      return Promise.resolve(null)
    }

    return new Promise((resolve, reject) => {
      jwt.verify(token, secretOrPublicKey, options, (error, decoded) => {
        if (error) {
          return reject(error)
        }
        resolve(decoded ?? null)
      })
    })
  }

  return async <ReturnType extends Record<string, unknown>>(contextFunction: ContextFunction<ReturnType>) => {

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
