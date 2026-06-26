import { ref, type Ref } from "vue";

import { getErrorMessage } from "../utils/errors";

interface AsyncActionState {
  loading: Ref<boolean>;
  error: Ref<string>;
  execute: <T>(action: () => Promise<T>) => Promise<T | undefined>;
  clearError: () => void;
}

export function useAsyncAction(): AsyncActionState {
  const loading = ref(false);
  const error = ref("");

  async function execute<T>(action: () => Promise<T>): Promise<T | undefined> {
    loading.value = true;
    error.value = "";

    try {
      return await action();
    } catch (err) {
      error.value = getErrorMessage(err);
      return undefined;
    } finally {
      loading.value = false;
    }
  }

  function clearError(): void {
    error.value = "";
  }

  return {
    loading,
    error,
    execute,
    clearError,
  };
}

interface KeyedAsyncActionState {
  loadingByKey: Ref<Record<string | number, boolean>>;
  execute: <T>(
    key: string | number,
    action: () => Promise<T>,
    onError?: (message: string) => void,
  ) => Promise<T | undefined>;
}

export function useKeyedAsyncAction(): KeyedAsyncActionState {
  const loadingByKey = ref<Record<string | number, boolean>>({});

  async function execute<T>(
    key: string | number,
    action: () => Promise<T>,
    onError?: (message: string) => void,
  ): Promise<T | undefined> {
    loadingByKey.value = { ...loadingByKey.value, [key]: true };

    try {
      return await action();
    } catch (err) {
      onError?.(getErrorMessage(err));
      return undefined;
    } finally {
      loadingByKey.value = { ...loadingByKey.value, [key]: false };
    }
  }

  return {
    loadingByKey,
    execute,
  };
}
