import { useState, useEffect, useCallback } from "react";
import { showGlobalToast } from "../utils/globalToast";

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

type UseAsyncResult<T> = AsyncState<T> & {
  refetch: () => Promise<void>;
};

export function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: React.DependencyList = [],
  initialData: T | null = null,
): UseAsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: true,
    error: null,
  });

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await asyncFn();
      setState({ data, loading: false, error: null });
    } catch (error) {
      const err = error as Error;
      setState({ data: initialData, loading: false, error: err });
      showGlobalToast(err.message || "Something went wrong", "error");
    }
  }, deps);

  useEffect(() => {
    execute();
  }, [execute]);

  return { ...state, refetch: execute };
}
