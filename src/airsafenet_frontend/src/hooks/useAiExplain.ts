import { useCallback, useEffect, useState } from "react";
import { getAirExplainApi } from "../api/air";
import type { AiExplainResponse } from "../types/air";

type UseAiExplainResult = {
  data: AiExplainResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

export function useAiExplain(): UseAiExplainResult {
  const [data, setData] = useState<AiExplainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getAirExplainApi();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải giải thích AI");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refresh: load };
}
