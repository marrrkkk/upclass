"use client"

import { useCallback, useEffect, useRef, useTransition } from "react"

import { useToast } from "@/components/ui/toast"
import { executeWithOfflineHandling } from "@/lib/offline-action-handler"
import {
  listOfflineActions,
  subscribeToOfflineQueue,
  type OfflineActionPayload,
  type OfflineActionType,
} from "@/lib/offline-queue"

/** Minimal shape every server action used by optimistic mutations returns. */
export type OptimisticMutationResult = {
  success: boolean
  error?: string
  queued?: boolean
}

export type OfflineMutationConfig = {
  type: OfflineActionType
  payload: OfflineActionPayload
}

export type QueuedMutationConfig<TState> = {
  /** Client-generated ID stored on the optimistic entity. */
  tempId: string
  /**
   * Remove the optimistic entity for `tempId` from `current`. Used both when
   * the queued action fails terminally and when it is successfully synced
   * (the queue entry disappears and the server refresh reconciles the list).
   */
  remove: (current: TState, tempId: string) => TState
}

export type OptimisticMutationOptions<TState, TResult extends OptimisticMutationResult> = {
  /** Wrap the server action with offline queue handling when provided. */
  offline?: OfflineMutationConfig
  /** Track a queued action by temp ID and reconcile it with queue results. */
  queued?: QueuedMutationConfig<TState>
  /**
   * Reconcile the optimistic state after a successful server response.
   * Receives the current (optimistic) state so temporary IDs can be replaced.
   * When omitted the optimistic state is kept as-is.
   */
  onSuccess?: (result: TResult, current: TState) => TState
  /**
   * Recover after a failed mutation. Receives the current state and the exact
   * pre-mutation snapshot. When omitted the pre-mutation snapshot is restored.
   */
  onError?: (error: string, current: TState, previous: TState) => TState
  /** Error toast title. Defaults to "Couldn't save changes". */
  errorTitle?: string
}

/**
 * Client-local optimistic mutation helper.
 *
 * Apply `next` synchronously, run `action` in a transition, reconcile on
 * success, and roll back to the exact previous state on failure while showing
 * a standardized error toast. Queued (offline) results keep the optimistic
 * entity visible until the queue reports a terminal failure.
 */
export function useOptimisticMutation<TState>(
  state: TState,
  setState: React.Dispatch<React.SetStateAction<TState>>,
) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const queuedTempIds = useRef(new Set<string>())
  const queuedConfigs = useRef(new Map<string, QueuedMutationConfig<TState>>())

  useEffect(() => {
    let cancelled = false

    const reconcileQueued = async () => {
      if (queuedTempIds.current.size === 0) return

      let actions
      try {
        actions = await listOfflineActions()
      } catch {
        return
      }
      if (cancelled) return

      for (const tempId of queuedTempIds.current) {
        const config = queuedConfigs.current.get(tempId)
        if (!config) continue

        const matching = actions.find(
          (action) =>
            action.payload &&
            typeof action.payload === "object" &&
            "tempId" in action.payload &&
            action.payload.tempId === tempId,
        )

        if (!matching) {
          queuedTempIds.current.delete(tempId)
          queuedConfigs.current.delete(tempId)
          setState((current) => config.remove(current, tempId))
          continue
        }

        if (matching.status === "failed") {
          queuedTempIds.current.delete(tempId)
          queuedConfigs.current.delete(tempId)
          setState((current) => config.remove(current, tempId))
          toast.error("Couldn't save changes", matching.lastError || "This action could not be synced.")
        }
      }
    }

    const unsubscribe = subscribeToOfflineQueue(reconcileQueued)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [setState, toast])

  const mutate = useCallback(
    async <TResult extends OptimisticMutationResult>(
      next: TState | ((previous: TState) => TState),
      action: () => Promise<TResult>,
      options?: OptimisticMutationOptions<TState, TResult>,
    ) => {
      const previous = stateRef.current
      const optimistic =
        typeof next === "function"
          ? (next as (previous: TState) => TState)(previous)
          : next
      setState(optimistic)

      startTransition(async () => {
        let result: TResult

        try {
          result = options?.offline
            ? ((await executeWithOfflineHandling(
                action,
                options.offline.type,
                options.offline.payload,
              )) as TResult)
            : await action()
        } catch (error) {
          const message = error instanceof Error ? error.message : "Something went wrong"
          setState((current) =>
            options?.onError ? options.onError(message, current, previous) : previous,
          )
          toast.error(options?.errorTitle ?? "Couldn't save changes", message)
          return
        }

        if (result.queued) {
          if (options?.queued) {
            queuedTempIds.current.add(options.queued.tempId)
            queuedConfigs.current.set(options.queued.tempId, options.queued)
          }
          return
        }

        if (result.success) {
          setState((current) =>
            options?.onSuccess ? options.onSuccess(result, current) : current,
          )
          return
        }

        const message = result.error || "Something went wrong"
        setState((current) =>
          options?.onError ? options.onError(message, current, previous) : previous,
        )
        toast.error(options?.errorTitle ?? "Couldn't save changes", message)
      })
    },
    [setState, toast],
  )

  return { mutate, pending }
}