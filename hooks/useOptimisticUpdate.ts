import { useCallback, useRef } from "react";

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error, rollback: () => void) => void;
  rollbackDelay?: number; // Delay before rolling back on error (ms)
}

/**
 * Hook for optimistic updates with automatic rollback on error
 */
export const useOptimisticUpdate = <T>(
  updateFn: (data: T) => Promise<void>,
  getCurrentState: () => T,
  setState: (state: T) => void
) => {
  const previousStateRef = useRef<T | null>(null);

  const optimisticUpdate = useCallback(
    async (
      optimisticState: T,
      options: OptimisticUpdateOptions<T> = {}
    ): Promise<void> => {
      // Save current state for rollback
      previousStateRef.current = getCurrentState();

      // Apply optimistic update immediately
      setState(optimisticState);

      try {
        // Perform actual update
        await updateFn(optimisticState);
        options.onSuccess?.(optimisticState);
      } catch (error: unknown) {
        // Rollback on error
        if (previousStateRef.current !== null) {
          const rollback = () => {
            setState(previousStateRef.current!);
            previousStateRef.current = null;
          };

          // Delay rollback slightly to allow error handling
          setTimeout(() => {
            rollback();
            options.onError?.(error as Error, rollback);
          }, options.rollbackDelay || 100);
        } else {
          options.onError?.(error as Error, () => { });
        }
        throw error;
      } finally {
        previousStateRef.current = null;
      }
    },
    [updateFn, getCurrentState, setState]
  );

  return { optimisticUpdate };
};

