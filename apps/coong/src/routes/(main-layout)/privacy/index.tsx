import {LegalPlaceholderArticle} from '../_components/LegalPlaceholderArticle'

export const route = {
  info: {
    meta: {
      description: 'Temporary placeholder privacy page for Coong.',
      title: 'Privacy Policy',
    },
    public: true,
  },
} satisfies RouteDefinition

export default function PrivacyPage() {
  return (
    <LegalPlaceholderArticle
      summary="This route exists only as a temporary placeholder until the final privacy policy is published."
      title="Privacy Policy"
    />
  )
}
