/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it} from 'vitest'

import originalJoyFace from '../../features/text-mood/assets/faces/joy.webp'
import scribbleJoyFace from '../../features/text-mood/assets/faces/scribble/joy.webp'
import type {PSceneStyle} from '../../features/focus-room-animation'
import {PFaceIcon} from '../PFaceIcon'

it('should render the face icon set matching the scene style', () => {
  const [sceneStyle, setSceneStyle] = createSignal<PSceneStyle>('original')

  render(() => <PFaceIcon alt="밝음·즐거움 감정" mood="cheerful" sceneStyle={sceneStyle()} />)

  const image = screen.getByRole('img', {name: '밝음·즐거움 감정'})

  expect(image.getAttribute('src')).toBe(originalJoyFace)

  setSceneStyle('scribble')

  expect(image.getAttribute('src')).toBe(scribbleJoyFace)
})

it('should hide a decorative face icon from accessibility APIs', () => {
  const {container} = render(() => <PFaceIcon alt="" class="face" mood="calm" />)

  expect(container.querySelector('img')).toMatchObject({
    ariaHidden: 'true',
    className: 'face',
  })
})
