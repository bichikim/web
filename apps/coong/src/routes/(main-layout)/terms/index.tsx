import {LegalPlaceholderArticle} from '../_components/LegalPlaceholderArticle'

export const route = {
  info: {
    meta: {
      description: 'Temporary placeholder terms page for Coong.',
      title: 'Terms of Service',
    },
    public: true,
  },
} satisfies RouteDefinition

export default function TermsPage() {
  return (
    <LegalPlaceholderArticle
      summary="This route exists only as a temporary placeholder until the final terms of service are published."
      title="Terms of Service"
    />
  )
}
