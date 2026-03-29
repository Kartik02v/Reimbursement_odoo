'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { signupAction } from './actions/auth-actions';
import type { User, Company, Country } from './types';
import { countries } from './mock-data';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, companyName: string, country: Country, role?: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: 'admin' | 'manager' | 'employee') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const isLoading = status === 'loading';

  // Sync NextAuth session with local state
  useEffect(() => {
    const syncUser = async () => {
      if (session?.user) {
        try {
          // Fetch full user details from API
          const response = await fetch(`/api/users/${session.user.id}`);
          if (response.ok) {
            const userData = await response.json();
            setUser(userData.data as User);
            
            // Fetch company data if available
            if (userData.data.companyId) {
              setCompany({
                id: userData.data.companyId,
                name: 'Acme Corporation',
                country: countries[0],
                currency: 'USD',
                createdAt: new Date(),
              } as Company);
            }
          }
        } catch (error) {
          console.error('Failed to fetch user details:', error);
          // Fallback to session data
          setUser({
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            role: session.user.role,
            companyId: session.user.companyId,
            department: session.user.department,
            managerId: session.user.managerId,
          } as User);
        }
      } else {
        setUser(null);
        setCompany(null);
      }
    };

    syncUser();
  }, [session]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.ok && !result?.error) {
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
    role: string = 'employee'
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

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        isAuthenticated: !!session?.user,
        isLoading,
        login,
        signup,
        logout,
        switchRole,
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

export { countries };
