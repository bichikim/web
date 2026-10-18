import {and, eq} from 'drizzle-orm'
import {apiAiJobs, apiAiRouting, getDatabase, withTransactionalDatabase} from 'src/server/database'
import {
  type AdminApiAiPage,
  type ApiAiCatalogUpdate,
  apiAiRouteListSchema,
  type ApiAiRouting,
  apiAiRoutingSchema,
  type ApiAiRoutingUpdate,
  MAXIMUM_API_AI_MODELS,
} from 'src/features/admin-api-ai/contracts'
import {
  getCompatibleApiAiRoutes,
  getDefaultApiAiRouting,
  resolveApiAiRoutes,
  validateApiAiRouting,
} from 'src/server/api-ai/routing'
import {getApiAiModelCatalog} from 'src/server/api-ai/model-catalog'
import type {ApiAiProvider} from 'src/server/api-ai/types'

// The existing cloud-text row stores the common server order.
const ROUTING_KEY = 'cloud-text'

/** Returns the persisted order or the environment default without exposing credentials. */
export const readAdminApiAiPage = async (
  providers: ReadonlyArray<ApiAiProvider>,
  defaults: ReadonlyArray<ApiAiProvider>,
): Promise<AdminApiAiPage> => {
  const [stored] = await getDatabase()
    .select()
    .from(apiAiRouting)
    .where(eq(apiAiRouting.kind, ROUTING_KEY))
  const routing =
    stored === undefined
      ? getDefaultApiAiRouting(defaults, ROUTING_KEY)
      : apiAiRoutingSchema.parse(stored.routing)
  return {
    ...routing,
    catalog: getApiAiModelCatalog(routing.catalog ?? [], routing.routes, providers),
    providers: providers
      .filter((provider) => provider.models['cloud-text'] !== undefined)
      .map((provider) => ({
        id: provider.id,
        models: provider.models,
        protocol: provider.protocol ?? 'openai-responses-background',
      })),
    revision: stored?.revision ?? 0,
    source: stored === undefined ? 'environment' : 'admin',
  }
}

/** Saves an order only if its revision still matches the administrator's read. */
export const updateApiAiRouting = async (
  update: ApiAiRoutingUpdate,
  providers: ReadonlyArray<ApiAiProvider>,
  now: Date,
): Promise<'saved' | 'conflict' | 'invalid'> => {
  if (validateApiAiRouting(providers, update) !== 'valid') {
    return 'invalid'
  }
  const [stored] = await getDatabase()
    .select()
    .from(apiAiRouting)
    .where(eq(apiAiRouting.kind, ROUTING_KEY))
  if ((stored?.revision ?? 0) !== update.revision) {
    return 'conflict'
  }
  const previous = stored === undefined ? undefined : apiAiRoutingSchema.parse(stored.routing)
  return persistRouting(update.revision, {catalog: previous?.catalog, routes: update.routes}, now)
}

const persistRouting = async (
  revision: number,
  routing: ApiAiRouting,
  now: Date,
): Promise<'saved' | 'conflict'> => {
  const values = {revision: revision + 1, routing, updatedAt: now}
  const database = getDatabase()
  const updated =
    revision === 0
      ? await database
          .insert(apiAiRouting)
          .values({...values, kind: ROUTING_KEY})
          .onConflictDoNothing()
          .returning({kind: apiAiRouting.kind})
      : await database
          .update(apiAiRouting)
          .set(values)
          .where(and(eq(apiAiRouting.kind, ROUTING_KEY), eq(apiAiRouting.revision, revision)))
          .returning({kind: apiAiRouting.kind})
  return updated.length === 1 ? 'saved' : 'conflict'
}

/** Changes the registered model catalog without replacing the common execution order. */
export const updateApiAiCatalog = async (
  update: ApiAiCatalogUpdate,
  providers: ReadonlyArray<ApiAiProvider>,
  defaults: ReadonlyArray<ApiAiProvider>,
  now: Date,
): Promise<'saved' | 'conflict' | 'invalid'> => {
  const [stored] = await getDatabase()
    .select()
    .from(apiAiRouting)
    .where(eq(apiAiRouting.kind, ROUTING_KEY))
  if ((stored?.revision ?? 0) !== update.revision) {
    return 'conflict'
  }
  const routing =
    stored === undefined
      ? getDefaultApiAiRouting(defaults, ROUTING_KEY)
      : apiAiRoutingSchema.parse(stored.routing)
  const catalog = routing.catalog ?? []
  const matches = (entry: {readonly providerId: string; readonly model: string}) =>
    entry.providerId === update.entry.providerId && entry.model === update.entry.model
  const selected = getApiAiModelCatalog(catalog, routing.routes, providers).find(matches)
  const configured = providers.some(
    (provider) =>
      provider.id === update.entry.providerId && provider.models['cloud-text'] !== undefined,
  )
  if (
    update.operation === 'register'
      ? !configured || selected !== undefined || catalog.length >= MAXIMUM_API_AI_MODELS
      : selected?.removable !== true
  ) {
    return 'invalid'
  }
  return persistRouting(
    update.revision,
    {
      catalog:
        update.operation === 'register'
          ? [...catalog, update.entry]
          : catalog.filter((entry) => !matches(entry)),
      routes: routing.routes,
    },
    now,
  )
}

/** Freezes the current order for a job before transport dispatch or capacity reservation. */
export const resolveApiAiJobProviders = (
  jobId: string,
  providers: ReadonlyArray<ApiAiProvider>,
  defaults: ReadonlyArray<ApiAiProvider>,
): Promise<ReadonlyArray<ApiAiProvider>> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [job] = await transaction
        .select()
        .from(apiAiJobs)
        .where(eq(apiAiJobs.id, jobId))
        .for('update')
        .limit(1)
      if (job === undefined) {
        return []
      }
      if (job.routing !== null) {
        return resolveApiAiRoutes(providers, apiAiRouteListSchema.parse(job.routing), job.kind)
      }
      const [stored] = await transaction
        .select()
        .from(apiAiRouting)
        .where(eq(apiAiRouting.kind, ROUTING_KEY))
        .limit(1)
      const routing =
        stored === undefined
          ? getDefaultApiAiRouting(defaults, job.kind)
          : apiAiRoutingSchema.parse(stored.routing)
      if (validateApiAiRouting(providers, routing) !== 'valid') {
        throw new TypeError('Stored AI routing cannot be resolved against configured providers')
      }
      const routes = getCompatibleApiAiRoutes(providers, routing.routes, job.kind)
      if (routes.length === 0) {
        return []
      }
      const resolved = resolveApiAiRoutes(providers, routes, job.kind)
      await transaction.update(apiAiJobs).set({routing: routes}).where(eq(apiAiJobs.id, job.id))
      return resolved
    }),
  )
