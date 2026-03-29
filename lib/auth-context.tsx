'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, Company, Country } from './types';
import { mockUsers, mockCompany, countries } from './mock-data';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, companyName: string, country: Country) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: 'admin' | 'manager' | 'employee') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('reimbursement_user');
    const savedCompany = localStorage.getItem('reimbursement_company');
    
    if (savedUser && savedCompany) {
      setUser(JSON.parse(savedUser));
      setCompany(JSON.parse(savedCompany));
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const foundUser = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (foundUser) {
      setUser(foundUser);
      setCompany(mockCompany);
      localStorage.setItem('reimbursement_user', JSON.stringify(foundUser));
      localStorage.setItem('reimbursement_company', JSON.stringify(mockCompany));
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  }, []);

  const signup = useCallback(async (
    name: string,
    email: string,
    _password: string,
    companyName: string,
    country: Country
  ): Promise<boolean> => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newCompany: Company = {
      id: `company-${Date.now()}`,
      name: companyName,
      country,
      createdAt: new Date(),
    };
    
    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      name,
      role: 'admin', // First user is always admin
      companyId: newCompany.id,
      avatar: name.split(' ').map(n => n[0]).join('').toUpperCase(),
      createdAt: new Date(),
    };
    
    setUser(newUser);
    setCompany(newCompany);
    localStorage.setItem('reimbursement_user', JSON.stringify(newUser));
    localStorage.setItem('reimbursement_company', JSON.stringify(newCompany));
    setIsLoading(false);
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setCompany(null);
    localStorage.removeItem('reimbursement_user');
    localStorage.removeItem('reimbursement_company');
  }, []);

  const switchRole = useCallback((role: 'admin' | 'manager' | 'employee') => {
    const roleUser = mockUsers.find(u => u.role === role);
    if (roleUser) {
      setUser(roleUser);
      localStorage.setItem('reimbursement_user', JSON.stringify(roleUser));
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        isAuthenticated: !!user,
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
