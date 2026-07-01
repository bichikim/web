import {RouteDefinition} from '@solidjs/router'
import {ResetPassword} from './_components/ResetPassword'

export const route = {
  info: {
    public: true,
  },
} satisfies RouteDefinition

export default function ResetPasswordPage() {
  return <ResetPassword />
}
