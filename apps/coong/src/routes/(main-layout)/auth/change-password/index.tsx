import {RouteDefinition} from '@solidjs/router'
import {ChangePassword} from './_components/ChangePassword'

export const route = {
  info: {
    public: true,
  },
} satisfies RouteDefinition

export default function ChangePasswordPage() {
  return <ChangePassword />
}
