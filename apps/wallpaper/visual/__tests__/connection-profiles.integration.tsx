import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {createLibraryRepository} from '@winter-love/wallpaper/settings/library-repository'
import type {PoffoConnections} from '@winter-love/wallpaper/settings/connections'
import {useWallpaperLibrary} from '../../src/features/library'
import {SPoffoCalibrationPreview} from '../../src/components/SPoffoCalibrationPreview'
import {SPoffoConnectionProfiles} from '../../src/components/SPoffoConnectionProfiles'
import ashUrl from '../../../wallpaper-web/public/models/white-cat/model.poffo?url'
import 'virtual:uno.css'

vi.mock('../../src/features/background/use-puppet', () => ({usePuppet: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

test('should save and restore all Poffo settings across tabs without exporting character data', async () => {
  const repository = createLibraryRepository('wallpaper-library')
  const widget = await repository.addWidget('builtin:ash')
  let unmount: (() => void) | undefined
  try {
    const connections: PoffoConnections = {
      agentBindings: {working: {off: 0, on: 1, parameterId: 'Param71'}},
      lipsync: {
        gain: 0.8,
        shapes: {a: {inverted: true, parameterId: 'ParamMouthOpenY'}},
        source: 'voice',
      },
      semanticBindings: [
        {
          action: {id: '반짝이는 눈', kind: 'expression'},
          enabled: true,
          id: 'profile-happy',
          mode: 'toggle',
          parameterId: null,
          text: '정말 기뻐요',
          threshold: 0.8,
        },
      ],
      tracking: 'cursor',
      trackingBindings: {
        eyeY: {blend: 'overwrite', parameterId: 'ParamEyeBallY'},
        headX: {blend: 'add', inverted: true, parameterId: 'ParamAngleX'},
      },
      trackingOptions: {
        cameraFov: 65,
        cameraX: 0.6,
        cameraY: 0.1,
        cursorReach: 0.5,
        distance: 75,
        eyeCenterX: -0.1,
        eyeCenterY: 0.2,
        eyeMaximumX: 0.7,
        eyeMaximumY: 0.8,
        eyeMinimumX: -0.5,
        eyeMinimumY: -0.4,
        eyeResponseX: 0.8,
        eyeResponseY: 1.2,
        faceX: 0.4,
        faceY: 0.2,
        headCenterX: 4,
        headCenterY: -3,
        headMaximumX: 20,
        headMaximumY: 12,
        headMinimumX: -10,
        headMinimumY: -8,
        headResponseX: 0.5,
        headResponseY: 1.5,
        screenDiagonal: 24,
      },
    }
    await repository.configureConnections(widget.id, connections)
    const blob = await fetch(ashUrl).then((response) => response.blob())
    const urls = vi.spyOn(URL, 'createObjectURL')
    const clicks = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    const view = render(() => {
      const library = useWallpaperLibrary()
      const current = () => library.widgets().find((item) => item.id === widget.id)
      return (
        <SPoffoCalibrationPreview
          assetId={() => 'builtin:ash'}
          load={async () => blob}
          mode={current()?.tracking ?? 'off'}
          value={current()?.trackingOptions}
          bindings={() => current()?.trackingBindings}
          onChange={(options) => repository.configureTracking(widget.id, options)}
          profiles={(source) => (
            <SPoffoConnectionProfiles
              widget={current()}
              parameters={source.parameters()}
              actions={source.actions?.()}
              loading={source.loading()}
            />
          )}
        />
      )
    })
    unmount = view.unmount
    await expect
      .poll(
        () =>
          screen.getByRole('button', {name: '설정 JSON 불러오기'}).getAttribute('aria-disabled'),
        {timeout: 5000},
      )
      .toBe('false')
    expect(
      (screen.getByRole('spinbutton', {name: '얼굴 좌우 최대'}) as HTMLInputElement).value,
    ).toBe('20')
    const save = screen.getByRole('button', {name: '설정 JSON 저장'})
    fireEvent.click(screen.getByRole('radio', {name: '눈동자'}))
    expect(screen.getByRole('button', {name: '설정 JSON 저장'})).toBe(save)
    expect(
      (screen.getByRole('spinbutton', {name: '눈동자 상하 기본 방향'}) as HTMLInputElement).value,
    ).toBe('0.2')
    fireEvent.click(screen.getByRole('radio', {name: '연결'}))
    expect(screen.getByRole('button', {name: '설정 JSON 저장'})).toBe(save)
    fireEvent.click(save)
    expect(clicks).toHaveBeenCalledOnce()
    expect(clicks.mock.contexts[0]).toHaveProperty('download', 'poffo-settings.json')
    const exported = urls.mock.calls.at(-1)?.[0]
    if (!(exported instanceof Blob)) {
      throw new Error('Expected a settings JSON Blob')
    }
    const source = await exported.text()
    expect(JSON.parse(source)).toEqual({
      assetId: 'builtin:ash',
      connections,
      format: 'poffo-connections',
      version: 1,
    })
    await repository.configureConnections(widget.id, {
      agentBindings: {},
      lipsync: {source: 'off'},
      semanticBindings: [],
      tracking: 'off',
      trackingBindings: {},
      trackingOptions: {},
    })
    await expect
      .poll(
        async () =>
          (await repository.read()).widgets.find((item) => item.id === widget.id)?.tracking,
      )
      .toBe('off')
    const region = screen.getByRole('region', {name: 'Poffo 설정 파일'})
    const input = region.querySelector('input[type="file"]')
    if (input === null) {
      throw new Error('Expected the settings file picker')
    }
    fireEvent.change(input, {
      target: {files: [new File([source], 'poffo-settings.json', {type: 'application/json'})]},
    })
    await expect
      .poll(
        async () =>
          (await repository.read()).widgets.find((item) => item.id === widget.id)?.trackingOptions,
      )
      .toEqual(connections.trackingOptions)
    const stored = (await repository.read()).widgets.find((item) => item.id === widget.id)
    expect(stored).toMatchObject({
      speech: {
        agentBindings: connections.agentBindings,
        lipsync: connections.lipsync,
        semanticBindings: connections.semanticBindings,
      },
      tracking: 'cursor',
      trackingBindings: connections.trackingBindings,
      trackingOptions: connections.trackingOptions,
    })
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.click(screen.getByRole('radio', {name: '얼굴'}))
    await expect
      .poll(
        () => (screen.getByRole('spinbutton', {name: '얼굴 좌우 최대'}) as HTMLInputElement).value,
      )
      .toBe('20')
    fireEvent.click(screen.getByRole('radio', {name: '눈동자'}))
    expect(
      (screen.getByRole('spinbutton', {name: '눈동자 상하 기본 방향'}) as HTMLInputElement).value,
    ).toBe('0.2')
  } finally {
    unmount?.()
    await repository.removeWidget(widget.id)
    repository.close()
  }
}, 15_000)
