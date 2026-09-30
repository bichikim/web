export interface RainDrop {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly trail: boolean
}

export interface RainDroplet {
  readonly x: number
  readonly y: number
  readonly size: number
}

interface SimulatedDrop {
  id: number
  parentId: number | null
  density: number
  mass: number
  velocity: number
  drift: number
  resistance: number
  spreadX: number
  spreadY: number
  lastTrailX: number
  lastTrailY: number
  nextTrailDistance: number
  motionElapsed: number
  nextMotion: number
  trail: boolean
  x: number
  y: number
}

const GRAVITY = 2400
const EVAPORATION_PER_SECOND = 10
const MOVING_SPAWN_INTERVAL = 0.1
const MOVING_SIZE_MIN = 60
const MOVING_SIZE_MAX = 100
const MOVING_SIZE_RANGE = MOVING_SIZE_MAX - MOVING_SIZE_MIN
const MAX_MOVING_DROPS = 800
const MOTION_INTERVAL_MIN = 0.1
const MOTION_INTERVAL_RANGE = 0.3
const MAX_RESISTANCE_MULTIPLIER = 4
const MAX_HORIZONTAL_DRIFT = 0.1
const TRAIL_MASS_THRESHOLD = 1000
const TRAIL_DISTANCE_MIN = 20
const TRAIL_DISTANCE_RANGE = 10
const TRAIL_SIZE_MIN = 0.3
const TRAIL_SIZE_RANGE = 0.2
const TRAIL_DENSITY = 0.2
const TRAIL_HORIZONTAL_SPREAD = 0.1
const TRAIL_VERTICAL_SPREAD = 0.6
const TRAIL_POSITION_OFFSET = 5
const TRAIL_POSITION_FACTOR = 4
const INITIAL_SPREAD = 0.5
const SPREAD_DECAY = 0.01
const VELOCITY_SPREAD = 0.3
const VELOCITY_SPREAD_SPEED = 0.005
const TRAIL_VELOCITY_STRETCH = 0.01
const MERGE_DISTANCE_RATIO = 0.16
const TINY_DROPLETS_PER_SECOND = 500
const TINY_DROPLET_SIZE_MIN = 10
const TINY_DROPLET_SIZE_RANGE = 20
const MAX_STEP_SECONDS = 0.06
const DEMO_TIME_SCALE = 1.8
const OFFSCREEN_MARGIN = 100

const dropSize = (drop: SimulatedDrop) => {
  const base = Math.sqrt(drop.mass) / drop.density
  return {height: base * (1 + drop.spreadY), width: base * (1 + drop.spreadX)}
}

const distanceSquared = (left: SimulatedDrop, right: SimulatedDrop) =>
  (left.x - right.x) ** 2 + (left.y - right.y) ** 2

/** Simulates moving raindrops and emits tiny droplets for persistent GPU accumulation. */
export class RainSimulation {
  readonly #random: () => number
  #width: number
  #height: number
  #nextId = 0
  #spawnElapsed = MOVING_SPAWN_INTERVAL
  #dropletRemainder = 0
  #drops: SimulatedDrop[] = []
  #newDroplets: RainDroplet[] = []

  constructor(width: number, height: number, random: () => number = Math.random) {
    this.#width = width
    this.#height = height
    this.#random = random
  }

  get drops(): readonly RainDrop[] {
    return this.#drops.map((drop) => ({
      ...dropSize(drop),
      trail: drop.trail,
      x: drop.x,
      y: drop.y,
    }))
  }

  get newDroplets(): readonly RainDroplet[] {
    return this.#newDroplets
  }

  resize(width: number, height: number) {
    this.#width = width
    this.#height = height
    this.#newDroplets = []
  }

  step(elapsedSeconds: number) {
    const duration = Math.min(elapsedSeconds * DEMO_TIME_SCALE, MAX_STEP_SECONDS)
    this.#newDroplets = this.#spawnTinyDroplets(duration)
    this.#spawnElapsed += duration
    while (this.#spawnElapsed >= MOVING_SPAWN_INTERVAL) {
      this.#spawnElapsed -= MOVING_SPAWN_INTERVAL
      if (this.#drops.length < MAX_MOVING_DROPS) {
        this.#drops.push(
          this.#createDrop({
            size: MOVING_SIZE_MIN + this.#random() * MOVING_SIZE_RANGE,
            trail: false,
            x: this.#random() * this.#width,
            y: this.#random() * this.#height,
          }),
        )
      }
    }

    const trails = this.#drops.flatMap((drop) => this.#updateDrop(drop, duration))
    this.#drops.push(...trails)
    this.#mergeDrops()
    this.#drops = this.#drops.filter(
      (drop) => drop.mass > 0 && drop.y < this.#height + OFFSCREEN_MARGIN,
    )
  }

  #spawnTinyDroplets(duration: number): RainDroplet[] {
    const expected = this.#dropletRemainder + TINY_DROPLETS_PER_SECOND * duration
    const count = Math.floor(expected)
    this.#dropletRemainder = expected - count
    return Array.from({length: count}, () => ({
      size: TINY_DROPLET_SIZE_MIN + this.#random() * TINY_DROPLET_SIZE_RANGE,
      x: this.#random() * this.#width,
      y: this.#random() * this.#height,
    }))
  }

  #createDrop(options: {
    size: number
    trail: boolean
    x: number
    y: number
    density?: number
    parentId?: number
    spreadX?: number
    spreadY?: number
  }): SimulatedDrop {
    const density = options.density ?? 1
    const drop: SimulatedDrop = {
      density,
      drift: 0,
      id: this.#nextId,
      lastTrailX: options.x,
      lastTrailY: options.y,
      mass: (options.size * density) ** 2,
      motionElapsed: 0,
      nextMotion: 0,
      nextTrailDistance: TRAIL_DISTANCE_MIN + this.#random() * TRAIL_DISTANCE_RANGE,
      parentId: options.parentId ?? null,
      resistance: 0,
      spreadX: options.spreadX ?? INITIAL_SPREAD,
      spreadY: options.spreadY ?? INITIAL_SPREAD,
      trail: options.trail,
      velocity: 0,
      x: options.x,
      y: options.y,
    }
    this.#nextId += 1
    this.#randomizeMotion(drop)
    return drop
  }

  #updateDrop(drop: SimulatedDrop, duration: number): SimulatedDrop[] {
    drop.motionElapsed += duration
    if (drop.motionElapsed >= drop.nextMotion) {
      this.#randomizeMotion(drop)
    }
    drop.mass = Math.max(0, drop.mass - EVAPORATION_PER_SECOND * duration)
    if (drop.mass === 0) {
      return []
    }
    const acceleration = GRAVITY - drop.resistance / drop.mass
    drop.velocity = Math.max(0, drop.velocity + acceleration * duration)
    drop.x += drop.velocity * drop.drift * duration
    drop.y += drop.velocity * duration
    const spreadByVelocity =
      (VELOCITY_SPREAD * 2 * Math.atan(drop.velocity * VELOCITY_SPREAD_SPEED)) / Math.PI
    drop.spreadY = Math.max(drop.spreadY, spreadByVelocity)
    drop.spreadX *= SPREAD_DECAY ** duration
    drop.spreadY *= SPREAD_DECAY ** duration

    const trailDistance = (drop.x - drop.lastTrailX) ** 2 + (drop.y - drop.lastTrailY) ** 2
    if (drop.mass < TRAIL_MASS_THRESHOLD || trailDistance < drop.nextTrailDistance ** 2) {
      return []
    }
    const size = dropSize(drop)
    const trail = this.#createDrop({
      density: TRAIL_DENSITY,
      parentId: drop.id,
      size: size.width * (TRAIL_SIZE_MIN + this.#random() * TRAIL_SIZE_RANGE),
      spreadX: TRAIL_HORIZONTAL_SPREAD,
      spreadY: drop.velocity * TRAIL_VELOCITY_STRETCH * TRAIL_VERTICAL_SPREAD,
      trail: true,
      x: drop.x + (this.#random() * 2 - 1) * TRAIL_POSITION_OFFSET,
      y: drop.y - size.height / TRAIL_POSITION_FACTOR,
    })
    drop.mass -= trail.mass
    drop.lastTrailX = drop.x
    drop.lastTrailY = drop.y
    drop.nextTrailDistance = TRAIL_DISTANCE_MIN + this.#random() * TRAIL_DISTANCE_RANGE
    return [trail]
  }

  #randomizeMotion(drop: SimulatedDrop) {
    drop.motionElapsed = 0
    drop.nextMotion = MOTION_INTERVAL_MIN + this.#random() * MOTION_INTERVAL_RANGE
    drop.resistance = this.#random() * GRAVITY * MOVING_SIZE_MAX ** 2 * MAX_RESISTANCE_MULTIPLIER
    drop.drift = this.#random() * this.#random() * MAX_HORIZONTAL_DRIFT
  }

  #mergeDrops() {
    for (let index = 0; index < this.#drops.length; index += 1) {
      const drop = this.#drops[index]
      for (let otherIndex = index + 1; otherIndex < this.#drops.length; otherIndex += 1) {
        const other = this.#drops[otherIndex]
        const reach =
          dropSize(drop).width * (1 + drop.spreadX) * MERGE_DISTANCE_RATIO +
          dropSize(other).width * (1 + other.spreadX) * MERGE_DISTANCE_RATIO
        if (
          drop.parentId !== other.id &&
          other.parentId !== drop.id &&
          (drop.parentId === null || drop.parentId !== other.parentId) &&
          distanceSquared(drop, other) < reach ** 2
        ) {
          const mass = drop.mass + other.mass
          const velocity = (drop.velocity * drop.mass + other.velocity * other.mass) / mass
          if (drop.mass >= other.mass) {
            drop.velocity = velocity
            drop.mass = mass
            this.#drops.splice(otherIndex, 1)
            otherIndex -= 1
          } else {
            other.velocity = velocity
            other.mass = mass
            this.#drops.splice(index, 1)
            index -= 1
            break
          }
        }
      }
    }
  }
}
