import {createPaymentClient} from './create-payment-client'
import type {PayResult, PreparedPayment} from './types'

const paymentClient = createPaymentClient()

export const pay = (payment: PreparedPayment): Promise<PayResult> => paymentClient.pay(payment)
