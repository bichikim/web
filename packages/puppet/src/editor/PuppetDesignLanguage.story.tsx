import {For} from 'solid-js'
import type {Meta, StoryObj} from 'storybook-solidjs-vite'

import {PuppetEditor} from './PuppetEditor'

const SWATCHES = [
  {color: '#0b0f0e', label: 'Canvas', use: '작업 공간의 가장 깊은 바탕'},
  {color: '#101513', label: 'Panel', use: '레이어, 속성, 타임라인 패널'},
  {color: '#171e1b', label: 'Control', use: '기본 조작 요소'},
  {color: '#27302d', label: 'Divider', use: '영역과 구조 경계'},
  {color: '#edf4f0', label: 'Text', use: '핵심 정보와 현재 값'},
  {color: '#8f9d98', label: 'Muted text', use: '작은 보조 정보와 비활성 상태'},
  {color: '#64e5c4', label: 'Mint', use: '선택, 포커스, 주요 행동'},
  {color: '#e5b55a', label: 'Amber', use: '현재 위치와 처리 중 상태'},
  {color: '#ff7a76', label: 'Danger', use: '삭제와 복구가 필요한 오류'},
] as const

const PRINCIPLES = [
  {
    description:
      '모델링, 애니메이션, 재생 상태를 색 하나에 의존하지 않고 형태와 레이블로 함께 구분합니다.',
    title: '상태는 명시적으로',
  },
  {
    description:
      '레이어 → 캔버스 → 속성 → 키폼 순서가 유지되며, 조작 대상과 결과가 같은 화면에 남습니다.',
    title: '작업 흐름이 곧 배치',
  },
  {
    description:
      '짙은 중립색은 구조에 사용하고 Mint는 선택과 주요 행동, Amber는 시간 위치에 제한합니다.',
    title: '강조색은 역할별로',
  },
  {
    description:
      '좁은 패널에서도 이름, 값, 범위, 키폼 수가 같은 순서로 읽히는 고밀도 편집 UI를 유지합니다.',
    title: '밀도 속에서도 계층 유지',
  },
] as const

const meta = {
  component: PuppetEditor,
  parameters: {
    layout: 'fullscreen',
  },
  title: 'Puppet/Design System/Foundation',
} satisfies Meta<typeof PuppetEditor>

export default meta
type Story = StoryObj<typeof meta>

export const DesignLanguage: Story = {
  render: () => (
    <main class="puppet-design-language">
      <header>
        <span>Puppet visual language</span>
        <h1>정점과 시간의 관계를 직접 보이는 편집 도구</h1>
        <p>
          Puppet은 콘텐츠보다 편집 상태가 먼저 읽혀야 합니다. 패널 구조는 안정적인 짙은 중립색으로
          유지하고, 선택·시간·삭제처럼 사용자가 판단해야 하는 순간에만 색을 사용합니다.
        </p>
      </header>

      <section class="puppet-design-section" aria-labelledby="puppet-color-title">
        <h2 id="puppet-color-title">Color roles</h2>
        <div class="puppet-swatch-grid">
          <For each={SWATCHES}>
            {(swatch) => (
              <article class="puppet-swatch">
                <div class="puppet-swatch-color" style={{'--puppet-swatch-color': swatch.color}} />
                <div class="puppet-swatch-body">
                  <strong>{swatch.label}</strong>
                  <code>{swatch.color}</code>
                  <p>{swatch.use}</p>
                </div>
              </article>
            )}
          </For>
        </div>
      </section>

      <section class="puppet-design-section" aria-labelledby="puppet-principle-title">
        <h2 id="puppet-principle-title">Design principles</h2>
        <div class="puppet-principle-grid">
          <For each={PRINCIPLES}>
            {(principle) => (
              <article>
                <strong>{principle.title}</strong>
                <p>{principle.description}</p>
              </article>
            )}
          </For>
        </div>
      </section>

      <section class="puppet-design-section" aria-labelledby="puppet-control-title">
        <h2 id="puppet-control-title">Control hierarchy</h2>
        <div class="puppet-editor puppet-story-surface">
          <div class="puppet-control-row">
            <button class="toolbar-button primary" type="button">
              주요 행동
            </button>
            <button class="toolbar-button" type="button">
              보조 행동
            </button>
            <button class="toolbar-button" disabled type="button">
              비활성
            </button>
            <div class="renderer-status" data-status="ready">
              <span class="status-dot" aria-hidden="true" /> 준비됨
            </div>
            <div class="renderer-status" data-status="loading">
              <span class="status-dot" aria-hidden="true" /> 처리 중
            </div>
            <div
              aria-label="활성 크기 조절 핸들"
              aria-orientation="horizontal"
              class="panel-resizer dragging"
              role="separator"
            />
          </div>
        </div>
      </section>
    </main>
  ),
}
