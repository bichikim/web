import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {authorizeAdminRequest} from 'src/server/auth/authorize-admin-request'
import {readJsonBody} from 'src/server/http/body'
import {noStoreJson} from 'src/server/http/response'
import {type PaddlePrice, retrievePaddlePrice} from 'src/server/payment/providers/paddle'
import {connectAlbumOffer} from 'src/server/repositories/music-admin'

const MAXIMUM_BODY_SIZE = 8192
const MAXIMUM_IDENTIFIER_LENGTH = 255
const HTTP_BAD_REQUEST = 400
const HTTP_CONFLICT = 409
const HTTP_INTERNAL_SERVER_ERROR = 500
const HTTP_NOT_FOUND = 404
const MAXIMUM_FRACTIONAL_DIGITS = 6
const MAXIMUM_AMOUNT_MINOR = 9223372036854775807n
const amountMinorSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)$/u)
  .refine((value) => BigInt(value) <= MAXIMUM_AMOUNT_MINOR)
const currencySchema = z.string().regex(/^[A-Z]{3}$/u)
const fractionalDigitsSchema = z.number().int().min(0).max(MAXIMUM_FRACTIONAL_DIGITS)
const offerFieldsSchema = z.object({
  albumId: z.string().uuid(),
  externalProductId: z.string().trim().min(1).max(MAXIMUM_IDENTIFIER_LENGTH),
})
const appsInTossOfferSchema = offerFieldsSchema.extend({provider: z.literal('apps-in-toss')})
const paddleOfferSchema = offerFieldsSchema.extend({
  amountMinor: amountMinorSchema,
  currency: currencySchema,
  fractionalDigits: fractionalDigitsSchema,
  provider: z.literal('paddle'),
})
const offerSchema = z.discriminatedUnion('provider', [appsInTossOfferSchema, paddleOfferSchema])
type PaddleOfferRequest = z.infer<typeof paddleOfferSchema>

const isPaddlePriceMatch = (offer: PaddleOfferRequest, price: PaddlePrice): boolean =>
  price.active &&
  price.amountMinor === BigInt(offer.amountMinor) &&
  price.currency === offer.currency &&
  price.fractionalDigits === offer.fractionalDigits &&
  price.type === 'one_time'

const isOfferPriceValid = async (offer: z.infer<typeof offerSchema>): Promise<boolean> => {
  if (offer.provider !== 'paddle') {
    return true
  }

  const price = await retrievePaddlePrice(offer.externalProductId)
  return isPaddlePriceMatch(offer, price)
}

export const POST = async (event: APIEvent): Promise<Response> => {
  const authorization = await authorizeAdminRequest(event.request)

  if (!authorization.authorized) {
    return authorization.response
  }

  const bodyResult = await readJsonBody(event, MAXIMUM_BODY_SIZE)
  const parsedBody = offerSchema.safeParse(bodyResult.success ? bodyResult.body : null)

  if (!parsedBody.success) {
    return noStoreJson(
      {error: 'invalid_request'},
      {
        cookies: authorization.cookies,
        status: bodyResult.success ? HTTP_BAD_REQUEST : bodyResult.status,
      },
    )
  }

  try {
    if (!(await isOfferPriceValid(parsedBody.data))) {
      return noStoreJson(
        {error: 'paddle_price_mismatch'},
        {cookies: authorization.cookies, status: HTTP_CONFLICT},
      )
    }

    const result = await connectAlbumOffer(parsedBody.data)

    if (result.success) {
      return noStoreJson(result, {cookies: authorization.cookies})
    }

    return noStoreJson(result, {
      cookies: authorization.cookies,
      status: result.code === 'album_not_found' ? HTTP_NOT_FOUND : HTTP_CONFLICT,
    })
  } catch (error) {
    console.error('Failed to connect a commerce offer to an album', error)
    return noStoreJson(
      {error: 'offer_connection_failed'},
      {cookies: authorization.cookies, status: HTTP_INTERNAL_SERVER_ERROR},
    )
  }
}
