// noinspection ES6PreferShortImport

import {AuthTokenTypeConfig} from '@keystone-6/auth/dist/declarations/src/types'
import {sendMail} from '#src/utils/mailer'

export interface CreatePasswordResetLinkOptions {
  from: string
  link: string
  tokensValidForMins: number
}

const createGetPasswordResetEmailMessage =
  (url: string, from: string) => (to: string, token: string) => {
    const link = `${url}?token=${token}`
    return {
      from,
      subject: 'Password reset email for Coong.io',
      text: `Go link and reset your password: ${link}`,
      to,
    }
  }

export const createPasswordResetLink = (
  options: CreatePasswordResetLinkOptions,
): AuthTokenTypeConfig => {
  const {link, tokensValidForMins, from} = options
  const getPasswordResetEmailMessage = createGetPasswordResetEmailMessage(link, from)
  return {
    sendToken: async (args) => {
      const {token, identity} = args

      await sendMail(getPasswordResetEmailMessage(identity, token))
    },
    tokensValidForMins,
  }
}
