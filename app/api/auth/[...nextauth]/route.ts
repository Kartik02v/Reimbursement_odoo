import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { comparePasswords } from '@/lib/auth-utils';
import type { Adapter } from 'next-auth/adapters';

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'admin' | 'manager' | 'employee';
      companyId: string;
      department?: string;
      managerId?: string;
    };
  }

  interface User {
    role: 'admin' | 'manager' | 'employee';
    companyId: string;
    department?: string;
    managerId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'admin' | 'manager' | 'employee';
    companyId: string;
    department?: string;
    managerId?: string;
  }
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials');
        }

        try {
          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: {
              company: true,
            },
          });

          if (!user) {
            throw new Error('Invalid email or password');
          }

          // Verify password
          const isValid = await comparePasswords(
            credentials.password,
            user.password
          );

          if (!isValid) {
            throw new Error('Invalid email or password');
          }

          // Return user object
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as 'admin' | 'manager' | 'employee',
            companyId: user.companyId,
            department: user.department || undefined,
            managerId: user.managerId || undefined,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
    // Optional: Google OAuth Provider
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            profile(profile) {
              return {
                id: profile.sub,
                name: profile.name,
                email: profile.email,
                image: profile.picture,
                role: 'employee' as const,
                companyId: '', // Set default or get from invitation
              };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
        token.department = user.department;
        token.managerId = user.managerId;
      }

      // Handle session updates
      if (trigger === 'update' && session) {
        token = { ...token, ...session };
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.companyId = token.companyId;
        session.user.department = token.department;
        session.user.managerId = token.managerId;
      }

      return session;
    },
  },
  events: {
    async signIn({ user, isNewUser }) {
      console.log(`User signed in: ${user.email}${isNewUser ? ' (new user)' : ''}`);
      
      // Create audit log for sign in
      try {
        await prisma.auditLog.create({
          data: {
            userId: user.id!,
            userName: user.name || user.email || 'Unknown',
            actionType: 'USER_UPDATED',
            entityType: 'user',
            entityId: user.id!,
            entityName: user.name || user.email || 'Unknown',
            companyId: (user as any).companyId || 'company-1',
            newValue: JSON.stringify({
              email: user.email,
              timestamp: new Date().toISOString(),
            }),
          },
        });
      } catch (error) {
        console.error('Failed to create audit log:', error);
      }
    },
    async signOut({ token }) {
      console.log(`User signed out: ${token?.email}`);
      
      // Create audit log for sign out
      try {
        if (token?.id) {
          await prisma.auditLog.create({
            data: {
              userId: token.id as string,
              userName: (token.name as string) || (token.email as string) || 'Unknown',
              actionType: 'USER_UPDATED',
              entityType: 'user',
              entityId: token.id as string,
              entityName: (token.name as string) || (token.email as string) || 'Unknown',
              companyId: (token.companyId as string) || 'company-1',
              newValue: JSON.stringify({
                timestamp: new Date().toISOString(),
              }),
            },
          });
        }
      } catch (error) {
        console.error('Failed to create audit log:', error);
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);
