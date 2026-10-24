import {action} from '@solidjs/router'
import {fetchVerifyOtp} from 'src/server/functions/auth/fetch-verify-otp'

export const verifyOtpAction = action(fetchVerifyOtp, 'auth/verify-otp')
