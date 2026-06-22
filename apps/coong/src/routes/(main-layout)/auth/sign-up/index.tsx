import {SignUp} from './_components/SignUp'
import {RouteDefinition} from '@solidjs/router'

export const route = {
  info: {
    public: 'only-unauthorized',
  },
} satisfies RouteDefinition

export default function SignupPage() {
  return <SignUp />
}
