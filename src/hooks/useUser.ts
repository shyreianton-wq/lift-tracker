import { useState, useEffect } from 'react';
import { API_URL } from '@/config';

interface UserInfo {
  name: string;
  email: string | null;
  isAdmin: boolean;
}

export function useUser() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch(`${API_URL}/api/user`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
      setIsLoading(false);
    }
    fetchUser();
  }, []);

  return { user, isLoading };
}
