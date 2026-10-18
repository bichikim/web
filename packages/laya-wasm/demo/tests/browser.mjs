import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import {build, createServer, preview} from 'vite'

const configFile = fileURLToPath(new URL('../vite.config.ts', import.meta.url))
const production = process.argv.includes('--production')
const port = 3401
const deadline = 240_000
const epochs = 5
const importedCount = 2
const expectedSteps = epochs * importedCount
const tolerance = 1e-5
const choiceThreshold = 0.5
const percentageScale = 100
const cancellationEpochs = 500
let server
let browser
try {
  if (production) {
    await build({configFile})
    server = await preview({configFile, preview: {port}})
  } else {
    server = await createServer({configFile, server: {port}})
    await server.listen()
  }
  browser = await chromium.launch({headless: true})
  const page = await browser.newPage({viewport: {height: 1000, width: 1280}})
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const ready = async () => {
    await Promise.race([
      page.getByRole('status').filter({hasText: '모델 준비됨'}).waitFor({timeout: deadline}),
      page
        .getByRole('alert')
        .waitFor({timeout: deadline})
        .then(async () => {
          throw new Error(await page.getByRole('alert').innerText())
        }),
    ])
  }
  await page.goto(`http://127.0.0.1:${port}/`)
  const modelUrl = await page.getByRole('radio', {checked: true}).inputValue()
  const manifest = await (
    await page.request.get(`http://127.0.0.1:${port}${modelUrl}manifest.json`)
  ).json()
  const parameterCount = manifest.parameters.reduce(
    (sum, parameter) =>
      sum + parameter.dimensions.reduce((count, dimension) => count * dimension, 1),
    0,
  )
  await page.getByRole('heading', {exact: true, name: 'Laya 실험실'}).waitFor()
  const sample = await page.request.get(`http://127.0.0.1:${port}/training.jsonl`)
  assert.equal(sample.ok(), true)
  assert.equal((await sample.text()).trim().split('\n').length, importedCount)
  assert.equal(await page.getByRole('button', {name: '추론하기'}).isDisabled(), true)
  await page.getByLabel('분류 지시문', {exact: true}).fill('')
  await page.getByRole('button', {exact: true, name: '예제 추가'}).click()
  await page.getByRole('alert').filter({hasText: '분류 지시문을 입력하세요.'}).waitFor()
  await page.getByRole('button', {name: '닫기'}).click()
  await page.getByLabel('분류 지시문', {exact: true}).fill('Should this request be accepted?')
  await page.getByLabel('현재 입력의 정답').selectOption('1')
  await page.getByRole('button', {exact: true, name: '예제 추가'}).click()
  assert.equal(await page.getByRole('list', {name: '학습 예제'}).getByRole('listitem').count(), 1)
  const question = {
    criteria: ['accept', 'reject'],
    instructions: 'Should this request be accepted?',
    type: 'choice',
  }
  const examples = [
    {question, state: 'Please let me change the name on my account.', target: [0, 1]},
    {question, state: {request: 'Please update my account email address.'}, target: [0, 1]},
  ]
  const input = page.getByLabel('학습 JSONL 파일 가져오기')
  const invalid = examples
    .map((example, index) => JSON.stringify(index === 0 ? example : {...example, target: [0, 0]}))
    .join('\n')
  await input.setInputFiles({
    buffer: Buffer.from(invalid),
    mimeType: 'application/x-ndjson',
    name: 'invalid.jsonl',
  })
  await page.getByRole('alert').filter({hasText: '2번째 줄'}).waitFor()
  assert.equal(await page.getByRole('list', {name: '학습 예제'}).getByRole('listitem').count(), 1)
  await page.getByRole('button', {name: '닫기'}).click()
  await input.setInputFiles({
    buffer: Buffer.from(examples.map((example) => JSON.stringify(example)).join('\n')),
    mimeType: 'application/x-ndjson',
    name: 'training.jsonl',
  })
  const list = page.getByRole('list', {name: '학습 예제'})
  await page.getByRole('button', {exact: true, name: '예제 3 삭제'}).waitFor()
  assert.equal(await list.getByRole('listitem').count(), importedCount + 1)
  assert.ok((await list.innerText()).includes('"request"'))
  await page.getByRole('button', {exact: true, name: '예제 1 삭제'}).click()
  assert.equal(await list.getByRole('listitem').count(), importedCount)
  console.log('Loading model in Worker')
  await page.getByRole('button', {exact: true, name: '모델 불러오기'}).click()
  await ready()
  await page.getByRole('button', {name: '추론하기'}).click()
  const probability = page.getByRole('progressbar', {exact: true, name: 'reject 확률'})
  await probability.waitFor({timeout: deadline})
  const before = Number(await probability.getAttribute('value'))
  const answer = page.getByRole('status', {name: '추론 답'})
  await answer.getByText(before > choiceThreshold ? 'reject' : 'accept', {exact: true}).waitFor()
  assert.ok(
    (await answer.innerText()).includes(
      `확률 ${(Math.max(before, 1 - before) * percentageScale).toFixed(1)}%`,
    ),
  )
  const buttonBounds = await page.getByRole('button', {name: '추론하기'}).boundingBox()
  const answerBounds = await answer.boundingBox()
  assert.ok(buttonBounds !== null && answerBounds !== null)
  assert.ok(answerBounds.y >= buttonBounds.y + buttonBounds.height)
  assert.equal(
    await answer
      .locator('p')
      .nth(1)
      .evaluate((node) => getComputedStyle(node).fontSize),
    '30px',
  )
  // Train against the initial decision so the fixture works with either checkpoint.
  const target = before > choiceThreshold ? [1, 0] : [0, 1]
  const targetLabel = before > choiceThreshold ? 'accept' : 'reject'
  const targetBar = page.getByRole('progressbar', {exact: true, name: `${targetLabel} 확률`})
  const targetBefore = Number(await targetBar.getAttribute('value'))
  await page.getByRole('button', {exact: true, name: '예제 2 삭제'}).click()
  await page.getByRole('button', {exact: true, name: '예제 3 삭제'}).click()
  // Fit one repeated input; another input's update may move this probability in either direction.
  await input.setInputFiles({
    buffer: Buffer.from(
      examples
        .map((example) => JSON.stringify({...example, state: examples[0].state, target}))
        .join('\n'),
    ),
    mimeType: 'application/x-ndjson',
    name: 'training.jsonl',
  })
  await page.getByRole('button', {exact: true, name: '예제 5 삭제'}).waitFor()
  assert.equal(await list.getByRole('listitem').count(), importedCount)
  console.log('Training scorer')
  await page.getByRole('button', {name: '학습하고 결과 비교'}).click()
  await page.getByText('학습 완료', {exact: true}).waitFor({timeout: deadline})
  const after = Number(await probability.getAttribute('value'))
  const targetAfter = Number(await targetBar.getAttribute('value'))
  console.log(JSON.stringify({after, before, targetAfter, targetBefore, targetLabel}))
  assert.ok(targetAfter > targetBefore, 'Training must increase target probability')
  await answer.getByText(after > choiceThreshold ? 'reject' : 'accept', {exact: true}).waitFor()
  assert.ok(
    (await answer.innerText()).includes(
      `확률 ${(Math.max(after, 1 - after) * percentageScale).toFixed(1)}%`,
    ),
  )
  assert.equal(
    await page.getByRole('progressbar', {name: '학습 진행률'}).getAttribute('value'),
    String(expectedSteps),
  )
  await page.screenshot({fullPage: true, path: '/tmp/laya-demo-trained.png'})
  console.log('Checking checkpoint download and restore')
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', {exact: true, name: '다운로드'}).click()
  const download = await downloadEvent
  const checkpointPath = await download.path()
  const saved = JSON.parse(await readFile(checkpointPath, 'utf8'))
  assert.equal(saved.steps, expectedSteps)
  assert.equal(saved.modelId, manifest.modelId)
  assert.equal(saved.parameters.length, parameterCount)
  await page.getByRole('button', {name: '초기 가중치 복원'}).click()
  await page.getByText('누적 0 단계', {exact: true}).waitFor()
  await page.getByRole('button', {name: '추론하기'}).click()
  await ready()
  assert.ok(Math.abs(Number(await probability.getAttribute('value')) - before) < tolerance)
  await page.getByLabel('체크포인트 파일 불러오기').setInputFiles(checkpointPath)
  await page.getByText(`누적 ${expectedSteps} 단계`, {exact: true}).waitFor({timeout: deadline})
  await page.getByRole('button', {name: '추론하기'}).click()
  await ready()
  assert.ok(Math.abs(Number(await probability.getAttribute('value')) - after) < tolerance)
  await page.getByLabel('반복 횟수').fill(String(cancellationEpochs))
  await page.getByRole('button', {name: '학습하고 결과 비교'}).click()
  await page.waitForFunction(
    () => Number(document.querySelector('[aria-label="학습 진행률"]')?.getAttribute('value')) > 0,
    undefined,
    {timeout: deadline},
  )
  await page.getByRole('button', {exact: true, name: '학습 중지'}).click()
  await page.getByText('학습 중지됨', {exact: true}).waitFor({timeout: deadline})
  assert.ok(
    Number(await page.getByRole('progressbar', {name: '학습 진행률'}).getAttribute('value')) <
      cancellationEpochs * importedCount,
  )
  await page.getByLabel('질문 유형').selectOption('noul')
  await page
    .getByLabel('분류 지시문', {exact: true})
    .fill('The customer requests an account change.')
  await page.getByRole('button', {name: '추론하기'}).click()
  await page.getByRole('progressbar', {exact: true, name: 'true 확률'}).waitFor({timeout: deadline})
  await page.getByLabel('질문 유형').selectOption('score')
  await page.getByLabel('선택지', {exact: false}).fill('low\nmedium\nhigh')
  await page.getByRole('button', {name: '추론하기'}).click()
  await page.getByText('기대 점수:', {exact: false}).waitFor({timeout: deadline})
  const scores = await Promise.all(
    ['low', 'medium', 'high'].map(async (label) => ({
      label,
      probability: Number(
        await page
          .getByRole('progressbar', {exact: true, name: `${label} 확률`})
          .getAttribute('value'),
      ),
    })),
  )
  const [highest] = scores.sort((left, right) => right.probability - left.probability)
  await answer.getByText(highest.label, {exact: true}).waitFor()
  await page
    .getByLabel('체크포인트 파일 불러오기')
    .setInputFiles({buffer: Buffer.from('{}'), mimeType: 'application/json', name: 'invalid.json'})
  await page.getByRole('alert').filter({hasText: '체크포인트'}).waitFor()
  await page.setViewportSize({height: 900, width: 375})
  await page.screenshot({fullPage: true, path: '/tmp/laya-demo-mobile.png'})
  const layout = await page.evaluate(() => {
    const textLimit = 40
    return {
      overflow: [...document.querySelectorAll('body *')]
        .filter((node) => node.getBoundingClientRect().right > innerWidth)
        .map((node) => ({
          right: node.getBoundingClientRect().right,
          tag: node.tagName,
          text: node.textContent.slice(0, textLimit),
        })),
      scroll: document.documentElement.scrollWidth,
      width: innerWidth,
    }
  })
  assert.ok(layout.scroll <= layout.width, JSON.stringify(layout))
  assert.deepEqual(errors, [])
  console.log(
    JSON.stringify(
      {
        after,
        before,
        cancellation: 'passed',
        checkpoint: 'restored',
        importedCount,
        mobile: 'passed',
        production,
        targetAfter,
        targetBefore,
      },
      null,
      2,
    ),
  )
} finally {
  await browser?.close()
  if (server !== undefined) {
    if (production) {
      await new Promise((complete, reject) => {
        server.httpServer.close((error) => {
          if (error) {
            reject(error)
          } else {
            complete()
          }
        })
      })
    } else {
      await server.close()
    }
  }
}
