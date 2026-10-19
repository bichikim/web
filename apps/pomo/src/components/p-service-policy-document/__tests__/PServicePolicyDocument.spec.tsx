/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it} from 'vitest'

import {PServicePolicyDocument} from '../PServicePolicyDocument'

it('should update the footer class without replacing its content or focus', () => {
  const [footerClass, setFooterClass] = createSignal<string>()
  render(() => (
    <PServicePolicyDocument
      appReturnLink="Return"
      contents={[]}
      contentsLabel="Contents"
      contentsTitle="Contents"
      currentPolicy="refund"
      description="Description"
      eyebrow="Policy"
      footer={<a href="mailto:help@example.com">Contact</a>}
      footerClass={footerClass()}
      platform="apps-in-toss"
      title="Policy"
    >
      Content
    </PServicePolicyDocument>
  ))

  const contact = screen.getByRole('link', {name: 'Contact'})
  const footer = contact.closest('footer')!
  const defaultClass = footer.className
  expect(defaultClass.split(' ')).toContain('gap-2')
  contact.focus()

  setFooterClass('grid gap-3')
  expect(footer.className).toBe('grid gap-3')
  expect(screen.getByRole('link', {name: 'Contact'})).toBe(contact)
  expect(contact).toHaveFocus()

  setFooterClass('')
  expect(footer.className).toBe('')
  setFooterClass(undefined)
  expect(footer.className).toBe(defaultClass)
  expect(contact).toHaveFocus()
})
