/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {SERVICE_OPERATOR} from 'src/features/service-operator'
import {EnglishPrivacyPolicyContent} from '../EnglishPrivacyPolicyContent'

vi.mock('src/features/service-operator', () => ({
  SERVICE_OPERATOR: {
    supportEmail: 'privacy-support@example.test',
    supportPhone: '02-0000-1234',
  },
}))

it.each([undefined, 'web', 'apps-in-toss'] as const)(
  'should use shared contact details while preserving English names on %s',
  (platform) => {
    render(() => <EnglishPrivacyPolicyContent platform={platform} />)

    const supportLinks = screen.getAllByRole('link', {name: SERVICE_OPERATOR.supportEmail})
    expect(supportLinks).toHaveLength(4)
    for (const link of supportLinks) {
      expect(link).toHaveAttribute('href', `mailto:${SERVICE_OPERATOR.supportEmail}`)
    }
    expect(screen.getAllByText(`Phone: ${SERVICE_OPERATOR.supportPhone}`)).toHaveLength(2)
    expect(screen.getByText('Business name: Kuwoong')).toBeInTheDocument()
    expect(screen.getByText('Representative: Bichi Kim')).toBeInTheDocument()
  },
)
