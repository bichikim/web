// noinspection ES6PreferShortImport

import {AuthTokenTypeConfig} from '@keystone-6/auth/dist/declarations/src/types'
import {send} from '../mailer'

export interface CreateMagicAuthLinkOptions {
  from : string
  link: string
  tokensValidForMins: number
}

const creatGetMagicAuthLinkEmailMessage = (url: string, from: string) => (to: string, token: string) => {
  const link = `${url}?token=${token}`
  return {
    from,
    subject: 'To Sign In for Coong.io',
    text: `Go To Sign In: ${link}`,
    to,
  }
}

export const createMagicAuthLink = (options: CreateMagicAuthLinkOptions): AuthTokenTypeConfig => {
  const {link, from, tokensValidForMins} = options

  const getMagicAuthLinkEmailMessage = creatGetMagicAuthLinkEmailMessage(link, from)

  return {
    sendToken: async (args) => {
      const {identity, token} = args
      await send(getMagicAuthLinkEmailMessage(identity, token))
    },
    tokensValidForMins,
  }
}
