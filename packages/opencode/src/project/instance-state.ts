import { Context } from "../util/context"
import { State } from "./state"

interface InstanceContext {
  directory: string
  worktree: string
  project: any
}

// Create the context here to avoid circular dependency
export const instanceContext = Context.create<InstanceContext>("instance")

// Helper to get directory - defined separately to avoid circular dependency issues
function getDirectory() {
  return instanceContext.use().directory
}

/**
 * Create instance-scoped state that persists per project directory.
 * This is exported separately from Instance to allow importing without
 * triggering circular dependency issues in Node.js ESM.
 */
export function createInstanceState<S>(init: () => S, dispose?: (state: Awaited<S>) => Promise<void>): () => S {
  return State.create(getDirectory, init, dispose)
}
