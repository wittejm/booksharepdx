import { createContext, useContext, useCallback } from "react";
import type { InterestSummary } from "@booksharepdx/shared";
import { interestService } from "../services";
import { useUser } from "./UserContext";
import { useAsync } from "../hooks/useAsync";

interface InterestContextType {
  summary: InterestSummary;
  loading: boolean;
  refresh: () => Promise<void>;
}

const defaultSummary: InterestSummary = {
  totalCount: 0,
  uniquePeople: 0,
  uniquePosts: 0,
  interests: [],
};

// eslint-disable-next-line react-refresh/only-export-components
export const InterestContext = createContext<InterestContextType>({
  summary: defaultSummary,
  loading: false,
  refresh: async () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useInterest = () => useContext(InterestContext);

export function InterestProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useUser();

  const fetchInterests = useCallback(async (): Promise<InterestSummary> => {
    if (!currentUser) return defaultSummary;
    return interestService.getSummary();
  }, [currentUser]);

  const {
    data: summary,
    loading,
    refetch: refresh,
  } = useAsync(fetchInterests, [currentUser], defaultSummary);

  return (
    <InterestContext.Provider
      value={{ summary: summary ?? defaultSummary, loading, refresh }}
    >
      {children}
    </InterestContext.Provider>
  );
}
