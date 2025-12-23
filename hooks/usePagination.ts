import { useState, useCallback, useEffect } from "react";
import {
  PaginationOptions,
  PaginatedResult,
  getUsersByOrganizationPaginated,
  getMatchesByOrganizationPaginated,
} from "../services/database";
import { User, Match } from "../types";
import { getErrorMessage } from "../utils/errors";
import { QueryDocumentSnapshot } from "firebase/firestore";

interface UsePaginationResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const usePagination = <T extends User | Match>(
  type: "users" | "matches",
  organizationId: string | null,
  pageSize: number = 20
): UsePaginationResult<T> => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);

  const loadData = useCallback(
    async (append: boolean = false) => {
      if (!organizationId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        let result: PaginatedResult<T>;
        const options: PaginationOptions = {
          pageSize,
          lastDoc: append ? lastDoc : undefined,
        };

        if (type === "users") {
          result = (await getUsersByOrganizationPaginated(
            organizationId,
            options
          )) as PaginatedResult<T>;
        } else {
          result = (await getMatchesByOrganizationPaginated(
            organizationId,
            options
          )) as PaginatedResult<T>;
        }

        if (append) {
          setData((prev) => [...prev, ...result.data]);
        } else {
          setData(result.data);
        }

        setLastDoc(result.lastDoc);
        setHasMore(result.hasMore);
      } catch (err: unknown) {
        console.error(`Error loading paginated ${type}:`, err);
        setError(getErrorMessage(err) || `Failed to load ${type}`);
      } finally {
        setLoading(false);
      }
    },
    [organizationId, type, pageSize, lastDoc]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await loadData(true);
  }, [hasMore, loading, loadData]);

  const refresh = useCallback(async () => {
    setLastDoc(null);
    setHasMore(true);
    await loadData(false);
  }, [loadData]);

  useEffect(() => {
    loadData(false);
  }, [organizationId, type, pageSize]);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
};

