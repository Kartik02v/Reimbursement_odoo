/**
 * Security utilities for input sanitization and XSS prevention
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') return '';
  
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Remove HTML tags from string
 */
export function stripHtml(html: string): string {
  if (typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize user input for safe storage
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Trim whitespace
  let sanitized = input.trim();
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  return sanitized;
}

/**
 * Sanitize filename to prevent directory traversal
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') return '';
  
  // Remove directory separators and null bytes
  let sanitized = filename.replace(/[\/\\:\0]/g, '_');
  
  // Remove leading dots
  sanitized = sanitized.replace(/^\.+/, '');
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop();
    const name = sanitized.substring(0, 255 - (ext?.length || 0) - 1);
    sanitized = ext ? `${name}.${ext}` : name;
  }
  
  return sanitized || 'unnamed';
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  return email.toLowerCase().trim();
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== 'string') return null;
  
  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize phone number (remove non-numeric characters except +)
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') return '';
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeInput(item)
          : typeof item === 'object' && item !== null
          ? sanitizeObject(item)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

/**
 * Validate SQL-safe string (basic check, Prisma handles parameterization)
 */
export function isSqlSafe(input: string): boolean {
  if (typeof input !== 'string') return false;
  
  // Check for common SQL injection patterns
  const dangerousPatterns = [
    /(\s|^)(union|select|insert|update|delete|drop|create|alter|exec|execute)(\s|$)/i,
    /--/,
    /\/\*/,
    /\*\//,
    /;\s*$/,
    /'\s*or\s*'.*'=/i,
    /'\s*or\s*1\s*=\s*1/i,
  ];
  
  return !dangerousPatterns.some((pattern) => pattern.test(input));
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') return '';
  
  // Remove special regex characters that could cause issues
  let sanitized = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Limit length
  return sanitized.substring(0, 200);
}

/**
 * Validate JSON safely
 */
export function parseJsonSafely<T = any>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Sanitize currency amount (remove non-numeric except decimal point)
 */
export function sanitizeCurrency(amount: string): string {
  if (typeof amount !== 'string') return '0';
  
  // Remove everything except digits and decimal point
  const sanitized = amount.replace(/[^\d.]/g, '');
  
  // Ensure only one decimal point
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    return `${parts[0]}.${parts.slice(1).join('')}`;
  }
  
  return sanitized || '0';
}

/**
 * Check if string contains potential XSS
 */
export function containsXss(input: string): boolean {
  if (typeof input !== 'string') return false;
  
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i,
  ];
  
  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Sanitize for display in HTML (converts to plain text and escapes)
 */
export function sanitizeForDisplay(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Strip HTML then escape
  const stripped = stripHtml(input);
  return escapeHtml(stripped);
}

/**
 * Generate safe slug from string
 */
export function generateSlug(text: string): string {
  if (typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/[\s_-]+/g, '-') // Replace spaces with -
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing -
}
