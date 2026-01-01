import { createContext, useContext } from 'react';
import type { User } from '@booksharepdx/shared';

interface UserContextType {
  currentUser: User | null;
  updateCurrentUser: (user: User | null) => void;
}

export const UserContext = createContext<UserContextType>({
  currentUser: null,
  updateCurrentUser: () => {},
});

export const useUser = () => useContext(UserContext);
