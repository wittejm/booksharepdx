import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { InterestSummary } from '@booksharepdx/shared';
import { interestService } from '../services';
import { useUser } from './UserContext';

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
  const [summary, setSummary] = useState<InterestSummary>(defaultSummary);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!currentUser) {
      setSummary(defaultSummary);
      return;
    }

    setLoading(true);
    try {
      const data = await interestService.getSummary();
      setSummary(data);
    } catch {
      setSummary(defaultSummary);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Fetch on mount and when user changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <InterestContext.Provider value={{ summary, loading, refresh }}>
      {children}
    </InterestContext.Provider>
  );
}
