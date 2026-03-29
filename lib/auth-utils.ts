import bcrypt from 'bcryptjs';

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a plain text password with a hashed password
 * @param password - Plain text password
 * @param hashedPassword - Hashed password from database
 * @returns True if passwords match
 */
export async function comparePasswords(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Validation result with error message if invalid
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  message?: string;
} {
  if (!password || password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long',
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      message: 'Password must be less than 128 characters',
    };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const requirements = [
    hasUpperCase,
    hasLowerCase,
    hasNumber,
    hasSpecialChar,
  ];
  const metRequirements = requirements.filter(Boolean).length;

  if (metRequirements < 3) {
    return {
      valid: false,
      message:
        'Password must contain at least 3 of: uppercase, lowercase, number, special character',
    };
  }

  return { valid: true };
}

/**
 * Generate a random token for password reset, email verification, etc.
 * @param length - Token length (default: 32)
 */
export function generateToken(length: number = 32): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const randomValues = new Uint8Array(length);
  
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    // Fallback for Node.js
    const nodeCrypto = require('crypto');
    nodeCrypto.randomFillSync(randomValues);
  }
  
  for (let i = 0; i < length; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  
  return token;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate session token
 */
export function generateSessionToken(): string {
  return generateToken(64);
}

/**
 * Check if user has required role
 */
export function hasRole(
  userRole: string,
  requiredRoles: string | string[]
): boolean {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return roles.includes(userRole);
}

/**
 * Check if user can perform action
 */
export function canPerformAction(
  userRole: 'admin' | 'manager' | 'employee',
  action: string
): boolean {
  const permissions = {
    admin: [
      'manage_users',
      'manage_hierarchy',
      'view_analytics',
      'manage_workflows',
      'approve_expenses',
      'create_expenses',
      'view_expenses',
      'manage_categories',
    ],
    manager: [
      'approve_expenses',
      'create_expenses',
      'view_expenses',
      'manage_team',
      'view_team_analytics',
    ],
    employee: ['create_expenses', 'view_expenses', 'edit_own_expenses'],
  };

  return permissions[userRole]?.includes(action) || false;
}
