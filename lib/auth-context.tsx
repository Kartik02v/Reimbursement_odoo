'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSession, signIn, signOut, getSession } from 'next-auth/react';
import { signupAction } from './actions/auth-actions';
import { CurrencyService } from './currency-service';
import type { User, Company, Country } from './types';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  countries: Country[];
  currencySymbol: string;
  currencyCode: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, companyName: string, country: Country, role?: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: 'admin' | 'manager' | 'employee') => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const isLoading = status === 'loading' || isSyncing;

  // Fetch countries on mount
  useEffect(() => {
    CurrencyService.getCountries().then(setCountries);
  }, []);

  const refreshUser = useCallback(async () => {
    if (session?.user?.id) {
      setIsSyncing(true);
      try {
        const response = await fetch(`/api/users/${session.user.id}`);
        if (response.ok) {
          const userData = await response.json();
          const fullUser = userData.data as User & { company: any };
          setUser(fullUser);
          
          if (fullUser.company) {
            setCompany({
              ...fullUser.company,
              createdAt: new Date(fullUser.company.createdAt || new Date()),
            } as Company);
          }
        }
      } catch (error) {
        console.error('Failed to refresh user details:', error);
      } finally {
        setIsSyncing(false);
      }
    }
  }, [session?.user?.id]);

  // Sync NextAuth session with local state
  useEffect(() => {
    if (session?.user) {
      // Set initial user from session as fallback (including permissions)
      const sessionUser = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role || 'employee',
        companyId: session.user.companyId || '',
        department: session.user.department,
        managerId: session.user.managerId,
        permissions: session.user.permissions || {},
      } as User;
      
      setUser(sessionUser);
      refreshUser();
    } else if (status !== 'loading') {
      setUser(null);
      setCompany(null);
    }
  }, [session, status, refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await signIn('credentials', {
        email,
        password,
        callbackUrl: '/dashboard',
        redirect: false,
      });

      if (result?.ok && !result?.error) {
        // Ensure session is fully available before navigation guards run
        for (let i = 0; i < 5; i++) {
          const session = await getSession();
          if (session?.user) {
            return true;
          }
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
        return true;
      }
      
      console.error('Login failed:', result?.error);
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, []);

  const signup = useCallback(async (
    name: string,
    email: string,
    password: string,
    companyName: string,
    country: Country,
    role: string = 'admin'
  ): Promise<boolean> => {
    try {
      const result = await signupAction({
        name,
        email,
        password,
        companyName,
        country,
        role: role as 'admin' | 'manager' | 'employee',
      });

      if (result.success) {
        // Auto login after signup
        await login(email, password);
        return true;
      }
      
      console.error('Signup failed:', result.error);
      return false;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    }
  }, [login]);

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    setUser(null);
    setCompany(null);
  }, []);

  const switchRole = useCallback(async (role: 'admin' | 'manager' | 'employee') => {
    // For demo purposes - fetch a user with the specified role
    try {
      const response = await fetch(`/api/users?role=${role}&limit=1`);
      if (response.ok) {
        const data = await response.json();
        const roleUser = data.data[0];
        
        if (roleUser) {
          // In a real app, you'd need to login as this user
          // For now, just log them out and they can login as the role user
          console.log(`Switch to ${role} - Login as:`, roleUser.email);
          await logout();
        }
      }
    } catch (error) {
      console.error('Failed to switch role:', error);
    }
  }, [logout]);

  const currencySymbol = (company?.country as any)?.currency?.symbol || (company as any)?.currency?.symbol || '$';
  const currencyCode = (company?.country as any)?.currency?.code || (company as any)?.currency?.code || 'USD';

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        countries,
        currencySymbol,
        currencyCode,
        isAuthenticated: !!session?.user,
        isLoading,
        login,
        signup,
        logout,
        switchRole,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
