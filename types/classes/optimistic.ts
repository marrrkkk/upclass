import type {
  OptimisticMutationOptions,
  OptimisticMutationResult,
} from "@/hooks/use-optimistic-mutation"
import type { ClassCardData } from "@/types/classes"

/**
 * A class card that exists only on this client while its creation is in
 * flight or queued offline. Carries a stable `tempId` so later mutations can
 * replace or remove exactly this entry without disturbing other optimistic
 * entries.
 */
export type OptimisticClassCard = ClassCardData & {
  tempId: string
  pending?: boolean
  error?: string
}

/** The `mutate` handle from `useOptimisticMutation` for a class list. */
export type ClassListMutate = <TResult extends OptimisticMutationResult>(
  next: OptimisticClassCard[] | ((previous: OptimisticClassCard[]) => OptimisticClassCard[]),
  action: () => Promise<TResult>,
  options?: OptimisticMutationOptions<OptimisticClassCard[], TResult>,
) => Promise<void>