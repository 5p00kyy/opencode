import { createInstanceState } from "@/project/instance-state"
import { Instance } from "../project/instance"

export namespace Env {
  // Lazy initialization to avoid circular dependency issues
  let _state: (() => Record<string, string | undefined>) | undefined

  function state() {
    if (!_state) {
      _state = createInstanceState(() => {
        // Create a shallow copy to isolate environment per instance
        // Prevents parallel tests from interfering with each other's env vars
        return { ...process.env } as Record<string, string | undefined>
      })
    }
    return _state()
  }

  export function get(key: string) {
    const env = state()
    return env[key]
  }

  export function all() {
    return state()
  }

  export function set(key: string, value: string) {
    const env = state()
    env[key] = value
  }

  export function remove(key: string) {
    const env = state()
    delete env[key]
  }
}
