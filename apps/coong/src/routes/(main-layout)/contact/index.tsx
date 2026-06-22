import {LegalPlaceholderArticle} from '../_components/LegalPlaceholderArticle'

export const route = {
  info: {
    meta: {
      description: 'Temporary placeholder contact page for Coong.',
      title: 'Contact',
    },
    public: true,
  },
} satisfies RouteDefinition

export default function ContactPage() {
  return (
    <LegalPlaceholderArticle
      summary="This route exists only as a temporary placeholder until official contact details are published."
      title="Contact"
    />
  )
}
