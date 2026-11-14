import type {
  PuppetDocument,
  PuppetExpression,
  PuppetParameter,
  PuppetParameterRoles,
  PuppetSceneNode,
} from '../player/document'
import {parseDocumentValue} from '../player/parse-document'
import {convertCmo3, type ConvertCmo3Result} from './convert-cmo3'
import {convertMoc3} from './convert-moc3'
import {readCubismTexture} from './read-cubism-texture'
import {convertCubismMotion} from './convert-cubism-motion'
import {convertCubismPhysics} from './convert-cubism-physics'
import {convertCubismPose} from './convert-cubism-pose'
import {jsonArray, jsonNumber, jsonObject, jsonString} from './json-fields'
import {type CubismArchive, readCubismArchive, resolveCubismAsset} from './read-cubism-archive'
import {findCubismModel} from './find-cubism-model'
import {findMissingCubismAssets} from './find-missing-cubism-assets'
import {filterCubismReferences} from './filter-cubism-references'
import {readCubismExpressions} from './read-cubism-expressions'
import {readCubismMotions} from './read-cubism-motions'
import {reverseCmo3Parameters} from './reverse-cmo3-parameters'
import {convertCubismLayout} from './convert-cubism-layout'
import {encodeBase64} from '../encoding/encode-base64'
import {readWavHeader} from '../player/audio/decode-wav'

export interface ConvertCubismArchiveOptions {
  /** 편집 원본과 실행 파일의 축 방향이 다를 때 뒤집을 파라미터 ID. 생략하면 원본 방향을 유지한다. */
  readonly sourceReversedParameterIds?: ReadonlyArray<string>
  /** ZIP에 편집 원본이 없을 때 함께 제공하는 CMO3. 호출자가 소유하며 변경하지 않는다. */
  readonly modelSource?: ArrayBuffer | Uint8Array
  /** model3.json이 여러 개일 때 선택할 ZIP 내부 경로. 하나뿐이면 생략할 수 있다. */
  readonly modelPath?: string
}

const MODEL_VERSION = 3

const validateModel = (model: Record<string, unknown>) => {
  if (model.Version !== MODEL_VERSION) {
    throw new Error('Cubism model version must be 3')
  }
}

const choosePath = (
  paths: ReadonlyArray<string>,
  selected: string | undefined,
  kind: string,
): string => {
  const path = selected ?? (paths.length === 1 ? paths[0] : undefined)
  if (path === undefined || !paths.includes(path)) {
    throw new Error(`Cubism archive must select one ${kind} file`)
  }
  return path
}

const expressionBlend = (value: unknown) => {
  switch (value ?? 'Add') {
    case 'Add':
      return 'add'
    case 'Multiply':
      return 'multiply'
    case 'Overwrite':
      return 'overwrite'
    default:
      throw new Error(`Cubism expression blend ${String(value)} is not supported`)
  }
}

const expressionValue = (value: unknown) =>
  jsonNumber(
    typeof value === 'string' && /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/u.test(value)
      ? Number(value)
      : value,
  )

const convertExpression = (source: Record<string, unknown>, id: string): PuppetExpression => ({
  composition: 'cubism',
  fadeInTime: jsonNumber(source.FadeInTime, 1),
  fadeOutTime: jsonNumber(source.FadeOutTime, 1),
  id,
  parameters: jsonArray(source.Parameters).map((value) => {
    const parameter = jsonObject(value)
    return {
      blend: expressionBlend(parameter.Blend),
      parameterId: jsonString(parameter.Id),
      value: expressionValue(parameter.Value),
    }
  }),
})

const readExpressions = (
  references: Record<string, unknown>,
  readAsset: (reference: unknown) => Record<string, unknown>,
) => {
  const sources = jsonArray(references.Expressions ?? []).map((value) => {
    const entry = jsonObject(value)
    return {id: jsonString(entry.Name), source: readAsset(entry.File)}
  })
  const normalized = sources.some(({source}) =>
    jsonArray(source.Parameters).some((value) => typeof jsonObject(value).Value === 'string'),
  )
  return {
    expressions: sources.map(({id, source}) => convertExpression(source, id)),
    warnings: normalized ? ['표정의 숫자 문자열을 숫자로 정규화했습니다.'] : [],
  }
}

const renameScene = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  names: ReadonlyMap<string, string>,
): ReadonlyArray<PuppetSceneNode> =>
  nodes.map((node) =>
    node.kind === 'part'
      ? node
      : {
          ...node,
          children: renameScene(node.children, names),
          name: names.get(node.id) ?? node.name,
        },
  )

const readDisplayInfo = (document: PuppetDocument, display: Record<string, unknown>) => {
  const parameterInfo = new Map(
    jsonArray(display.Parameters ?? []).map((value) => {
      const entry = jsonObject(value)
      return [jsonString(entry.Id), entry] as const
    }),
  )
  const parameterGroups = jsonArray(display.ParameterGroups ?? []).map((value) => {
    const entry = jsonObject(value)
    return {
      id: jsonString(entry.Id),
      name: jsonString(entry.Name),
      ...(entry.GroupId === undefined || entry.GroupId === ''
        ? {}
        : {groupId: jsonString(entry.GroupId)}),
    }
  })
  const parameters = new Map(
    (document.parameters ?? []).map((parameter): [string, PuppetParameter] => {
      const info = parameterInfo.get(parameter.id)
      return [
        parameter.id,
        {
          ...parameter,
          ...(info === undefined ? {} : {name: jsonString(info.Name)}),
          ...(info?.GroupId === undefined || info.GroupId === ''
            ? {}
            : {groupId: jsonString(info.GroupId)}),
        },
      ]
    }),
  )

  const names = new Map(
    jsonArray(display.Parts ?? []).map((value) => {
      const entry = jsonObject(value)
      return [jsonString(entry.Id), jsonString(entry.Name)] as const
    }),
  )
  return {
    parameterGroups,
    parameters,
    scene: {roots: renameScene(document.scene?.roots ?? [], names)},
  }
}

const readRoles = (model: Record<string, unknown>): PuppetParameterRoles =>
  Object.fromEntries(
    jsonArray(model.Groups ?? [])
      .map((value) => {
        const group = jsonObject(value)
        const name = jsonString(group.Name)
        const key = name === 'EyeBlink' ? 'eyeBlink' : name === 'LipSync' ? 'lipSync' : undefined
        return key === undefined || group.Target !== 'Parameter'
          ? []
          : [[key, jsonArray(group.Ids).map(jsonString)]]
      })
      .flat(),
  )

const readMotions = (
  references: Record<string, unknown>,
  readAsset: (reference: unknown) => Record<string, unknown>,
  readBytes: (reference: unknown) => Uint8Array,
) => {
  const motionGroups = jsonObject(references.Motions ?? {})
  return Object.entries(motionGroups).flatMap(([group, entries]) =>
    jsonArray(entries).map((value, index) => {
      const entry = jsonObject(value)
      const motion = convertCubismMotion(readAsset(entry.File), {
        fadeInTime: entry.FadeInTime === undefined ? undefined : jsonNumber(entry.FadeInTime),
        fadeOutTime: entry.FadeOutTime === undefined ? undefined : jsonNumber(entry.FadeOutTime),
        group,
        id: `${group}:${index}`,
      })
      if (entry.Sound === undefined) {
        return motion
      }
      const bytes = readBytes(entry.Sound)
      const header = readWavHeader(bytes)
      if (!header.ok) {
        throw new Error(
          `Cubism motion sound is not a supported WAV: ${jsonString(entry.Sound)} (${header.error})`,
        )
      }
      return {
        ...motion,
        sound: {
          analysis: 'rms' as const,
          src: `data:audio/wav;base64,${encodeBase64(bytes)}`,
          volume: 'source' as const,
        },
      }
    }),
  )
}

const readUserData = (
  references: Record<string, unknown>,
  readAsset: (reference: unknown) => Record<string, unknown>,
) => {
  const userData =
    references.UserData === undefined ? [] : jsonArray(readAsset(references.UserData).UserData)
  return new Map(
    userData.map((value) => {
      const entry = jsonObject(value)
      if (entry.Target !== 'ArtMesh') {
        throw new Error(`Cubism user data target ${String(entry.Target)} is not supported`)
      }
      return [jsonString(entry.Id), jsonString(entry.Value)] as const
    }),
  )
}

const convertArchiveModel = (
  archive: ReturnType<typeof readCubismArchive>,
  references: Record<string, unknown>,
  readBytes: (reference: unknown) => Uint8Array,
  options: ConvertCubismArchiveOptions,
) => {
  const editorPaths = [...archive.entries.keys()].filter((path) => path.endsWith('.cmo3'))
  const modelSource =
    options.modelSource ??
    (editorPaths.length === 0
      ? undefined
      : archive.entries.get(choosePath(editorPaths, undefined, '.cmo3 editor source')))
  const converted =
    modelSource === undefined
      ? convertMoc3(readBytes(references.Moc), {
          textures: jsonArray(references.Textures).map((reference) =>
            readCubismTexture(readBytes(reference)),
          ),
        })
      : convertCmo3(modelSource)
  const reversed = options.sourceReversedParameterIds ?? []
  if (modelSource === undefined && reversed.length > 0) {
    throw new Error('sourceReversedParameterIds applies only to a CMO3 editor source')
  }
  return {
    ...converted,
    document:
      reversed.length === 0
        ? converted.document
        : reverseCmo3Parameters(converted.document, reversed),
  }
}

/** CMO3 원본과 SDK ZIP의 모션·물리·표시 정보를 하나의 Poffo 문서로 변환한다. */
export const convertCubismArchive = (
  source: ArrayBuffer | Uint8Array | CubismArchive,
  options: ConvertCubismArchiveOptions = {},
): ConvertCmo3Result => {
  const archive =
    source instanceof ArrayBuffer || source instanceof Uint8Array
      ? readCubismArchive(source)
      : source
  const {path: modelPath, model} = findCubismModel(archive.entries, options.modelPath)
  validateModel(model)
  const declaredReferences = jsonObject(model.FileReferences)
  const sourceReferences = {
    ...declaredReferences,
    Expressions: readCubismExpressions(archive, modelPath, declaredReferences.Expressions),
    Motions: readCubismMotions(archive, modelPath, declaredReferences.Motions),
  }
  const editorSource =
    options.modelSource !== undefined ||
    [...archive.entries.keys()].some((path) => path.endsWith('.cmo3'))
  const missing = findMissingCubismAssets(archive.entries, modelPath, sourceReferences, {
    editorSource,
  })
  const required = findMissingCubismAssets(archive.entries, modelPath, sourceReferences, {
    editorSource,
    requiredOnly: true,
  })
  if (required.length > 0) {
    throw new Error(`필요한 파일이 누락되었습니다.\n${missing.join('\n')}`)
  }
  const references = filterCubismReferences(archive.entries, modelPath, sourceReferences)
  const readAsset = (reference: unknown) =>
    archive.readJson(resolveCubismAsset(modelPath, jsonString(reference)))
  const readBytes = (reference: unknown) => {
    const path = resolveCubismAsset(modelPath, jsonString(reference))
    const bytes = archive.entries.get(path)
    if (bytes === undefined) {
      throw new Error(`Cubism asset is missing: ${path}`)
    }
    return bytes
  }
  const converted = convertArchiveModel(archive, references, readBytes, options)
  const base = converted.document
  const motions = readMotions(references, readAsset, readBytes)
  const display = readDisplayInfo(
    base,
    references.DisplayInfo === undefined ? {} : readAsset(references.DisplayInfo),
  )
  const {parameters, parameterGroups} = display
  const pose =
    references.Pose === undefined
      ? undefined
      : convertCubismPose(readAsset(references.Pose), {
          ...base,
          parameters: [...parameters.values()],
        })
  for (const parameter of pose?.parameters ?? []) {
    parameters.set(parameter.id, parameter)
  }
  for (const track of motions.flatMap((motion) => motion.tracks)) {
    if (track.kind === 'parameter' && !parameters.has(track.parameterId)) {
      const values = track.keyframes.map((key) => key.value)
      parameters.set(track.parameterId, {
        defaultValue: 0,
        id: track.parameterId,
        maximum: Math.max(1, ...values),
        minimum: Math.min(0, ...values),
        name: track.parameterId,
      })
    }
  }
  const dataByPart = readUserData(references, readAsset)
  const expressionPresets = readExpressions(references, readAsset)
  const document: PuppetDocument = {
    ...base,
    ...(model.Layout === undefined
      ? {}
      : {layout: convertCubismLayout(model.Layout, base.viewport)}),
    expressions: expressionPresets.expressions,
    hitAreas: jsonArray(model.HitAreas ?? []).map((value) => {
      const entry = jsonObject(value)
      return {id: jsonString(entry.Name), partIds: [jsonString(entry.Id)]}
    }),
    motionParameterBase: 'previous-frame',
    motionParameterPrecision: 'float32',
    motions,
    parameterGroups,
    parameterRoles: readRoles(model),
    parameters: [...parameters.values()],
    parts: base.parts.map((part) =>
      dataByPart.has(part.id) ? {...part, userData: dataByPart.get(part.id)} : part,
    ),
    ...(references.Physics === undefined
      ? {}
      : {physics: convertCubismPhysics(readAsset(references.Physics))}),
    ...(pose === undefined ? {} : {poseGroups: pose.poseGroups}),
    scene: display.scene,
  }
  const parsed = parseDocumentValue(document)
  if (!parsed.ok) {
    throw new Error('Converted Cubism bundle is not a valid Poffo document')
  }
  return {
    document: parsed.document,
    warnings: [
      ...converted.warnings.filter((warning) => !warning.startsWith('CMO3에 별도 모션')),
      ...missing.map((asset) => `선택 파일 누락: ${asset}`),
      ...expressionPresets.warnings,
    ],
  }
}
