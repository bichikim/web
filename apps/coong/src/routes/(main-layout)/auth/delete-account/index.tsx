import {DeleteAccount} from './_components/DeleteAccount'
import {RouteDefinition} from '@solidjs/router'

export const route = {
  info: {
    public: false,
  },
} satisfies RouteDefinition

export default function DeleteAccountPage() {
  return <DeleteAccount />
}
