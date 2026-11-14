import {expect, test} from 'playwright/test'

for (const card of [
  {add: '그룹 추가', initial: '정리 그룹', kind: 'group', label: '그룹 이름'},
  {add: '보정 추가', initial: '출력 보정', kind: 'correction', label: '보정 이름'},
] as const) {
  for (const text of ['한글 이름', '日本語の名前']) {
    test(`should retain ${card.kind} editing during Chromium composition of ${text}`, async ({
      page,
    }, testInfo) => {
      await page.goto('/studio')
      await page.getByRole('button', {exact: true, name: card.add}).click()
      await page.getByRole('button', {exact: true, name: '모든 카드 접기'}).click()
      await page.getByRole('button', {exact: true, name: '정렬'}).click()
      await page.getByRole('button', {exact: true, name: '그래프 맞춤'}).click()
      await page.getByRole('button', {exact: true, name: `${card.initial} 이름 바꾸기`}).dblclick()
      const input = page.getByRole('textbox', {exact: true, name: card.label})
      await expect(input).toBeFocused()
      const trace = await input.evaluateHandle((element) => {
        const events: Array<{
          type: string
          trusted: boolean
          composing?: boolean
          key?: string
          data?: string | null
          prevented: boolean
        }> = []
        for (const type of [
          'compositionstart',
          'compositionupdate',
          'compositionend',
          'input',
          'keydown',
        ]) {
          element.addEventListener(type, (event) => {
            events.push({
              composing:
                event instanceof KeyboardEvent || event instanceof InputEvent
                  ? event.isComposing
                  : undefined,
              data:
                event instanceof CompositionEvent || event instanceof InputEvent
                  ? event.data
                  : undefined,
              key: event instanceof KeyboardEvent ? event.key : undefined,
              prevented: event.defaultPrevented,
              trusted: event.isTrusted,
              type: event.type,
            })
          })
        }
        return events
      })
      const session = await page.context().newCDPSession(page)
      // Chromium's composition API exercises browser events, not an OS candidate window.
      await session.send('Input.imeSetComposition', {
        selectionEnd: text.length,
        selectionStart: text.length,
        text,
      })
      await expect(input).toHaveValue(text)
      await page.keyboard.press('Enter')
      const events = await trace.jsonValue()
      await testInfo.attach('composition-events', {
        body: JSON.stringify(events, null, 2),
        contentType: 'application/json',
      })
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({trusted: true, type: 'compositionstart'}),
          expect.objectContaining({composing: true, trusted: true, type: 'input'}),
          expect.objectContaining({
            composing: true,
            key: 'Enter',
            trusted: true,
            type: 'keydown',
          }),
        ]),
      )
      await expect(input).toBeFocused()
      await expect(input).toHaveValue(text)
      expect(events.at(-1)?.prevented).toBe(false)
      const savedNames = () =>
        page.evaluate((kind) => {
          const key = Object.keys(sessionStorage).find((candidate) =>
            candidate.startsWith('puppet:runtime-session:v1:'),
          )
          const profile = JSON.parse(sessionStorage.getItem(key ?? '') ?? '{}')
          return kind === 'group'
            ? profile.groups?.map((group: {name: string}) => group.name)
            : profile.mappings
                ?.filter((mapping: {parameterId: string}) =>
                  mapping.parameterId.startsWith('draft:'),
                )
                .map((mapping: {name?: string}) => mapping.name)
        }, card.kind)
      expect(await savedNames()).not.toContain(text)
      const updated = `${text}2`
      await session.send('Input.imeSetComposition', {
        selectionEnd: updated.length,
        selectionStart: updated.length,
        text: updated,
      })
      await expect(input).toHaveValue(updated)
      await session.send('Input.insertText', {text})
      await expect(input).toBeFocused()
      await expect(input).toHaveValue(text)
      expect(await trace.jsonValue()).toEqual(
        expect.arrayContaining([expect.objectContaining({data: text, type: 'compositionend'})]),
      )
      await page.keyboard.press('Enter')
      await expect(input).toHaveCount(0)
      await expect(
        page.getByRole('button', {exact: true, name: `${text} 이름 바꾸기`}),
      ).toBeVisible()
      await expect.poll(savedNames).toContain(text)
      await testInfo.attach('committed-events', {
        body: JSON.stringify(await trace.jsonValue(), null, 2),
        contentType: 'application/json',
      })
      await page.reload()
      await expect(
        page.getByRole('button', {exact: true, name: `${text} 이름 바꾸기`}),
      ).toBeVisible()
      await session.detach()
    })
  }
}
