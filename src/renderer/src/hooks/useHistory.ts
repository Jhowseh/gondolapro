import { useCallback, useState } from 'react'

const HISTORY_LIMIT = 100

interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

export type Updater<T> = T | ((previous: T) => T)

export function useHistory<T>(initial: () => T) {
  const [state, setState] = useState<HistoryState<T>>(() => ({ past: [], present: initial(), future: [] }))

  const set = useCallback((updater: Updater<T>) => {
    setState((current) => {
      const next = typeof updater === 'function' ? (updater as (previous: T) => T)(current.present) : updater
      if (Object.is(next, current.present)) {
        return current
      }
      return { past: [...current.past, current.present].slice(-HISTORY_LIMIT), present: next, future: [] }
    })
  }, [])

  const reset = useCallback((value: T) => {
    setState({ past: [], present: value, future: [] })
  }, [])

  const undo = useCallback(() => {
    setState((current) => {
      if (current.past.length === 0) {
        return current
      }
      const previous = current.past[current.past.length - 1]
      return { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future] }
    })
  }, [])

  const redo = useCallback(() => {
    setState((current) => {
      if (current.future.length === 0) {
        return current
      }
      const [next, ...rest] = current.future
      return { past: [...current.past, current.present], present: next, future: rest }
    })
  }, [])

  return {
    present: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    set,
    reset,
    undo,
    redo
  }
}
