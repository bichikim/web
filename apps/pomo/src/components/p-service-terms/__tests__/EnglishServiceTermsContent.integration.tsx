/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {SERVICE_OPERATOR} from 'src/features/service-operator'
import {EnglishServiceTermsContent} from '../EnglishServiceTermsContent'

vi.mock('src/features/service-operator', () => ({
  SERVICE_OPERATOR: {
    businessRegistrationNumber: '123-45-67890',
    supportEmail: 'terms-support@example.test',
    supportPhone: '02-0000-5678',
  },
}))

it.each([undefined, 'web', 'apps-in-toss'] as const)(
  'should use shared operator details while preserving English translations on %s',
  (platform) => {
    render(() => <EnglishServiceTermsContent platform={platform} />)

    const supportLinks = screen.getAllByRole('link', {name: SERVICE_OPERATOR.supportEmail})
    expect(supportLinks).toHaveLength(3)
    for (const link of supportLinks) {
      expect(link).toHaveAttribute('href', `mailto:${SERVICE_OPERATOR.supportEmail}`)
    }
    expect(screen.getByText(SERVICE_OPERATOR.businessRegistrationNumber)).toBeInTheDocument()
    expect(screen.getByText(SERVICE_OPERATOR.supportPhone)).toBeInTheDocument()
    expect(screen.getByText('Kuwoong')).toBeInTheDocument()
    expect(screen.getByText('Bichi Kim')).toBeInTheDocument()
    expect(
      screen.getByText('301-818, 11 Jagok-ro 11-gil, Gangnam-gu, Seoul, Republic of Korea'),
    ).toBeInTheDocument()
  },
)
