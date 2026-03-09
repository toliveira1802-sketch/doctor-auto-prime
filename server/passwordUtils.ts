/**
 * Password Utilities — Doctor Auto Prime
 * Handles bcrypt hashing and comparison for user passwords.
 * Also provides migration helper for plain-text → bcrypt transition.
 */
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = "123456";

/**
 * Hash a plain-text password using bcrypt.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compare a plain-text password against a bcrypt hash.
 */
export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Check if a stored password is already a bcrypt hash.
 * bcrypt hashes always start with "$2a$", "$2b$", or "$2y$" and are 60 chars.
 */
export function isBcryptHash(stored: string): boolean {
  return /^\$2[aby]\$\d{2}\$.{53}$/.test(stored);
}

/**
 * Verify password with automatic migration support.
 * If the stored password is plain-text (legacy), compare directly.
 * If it's a bcrypt hash, use bcrypt.compare.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (isBcryptHash(stored)) {
    return comparePassword(plain, stored);
  }
  // Legacy plain-text comparison
  return plain === stored;
}

/**
 * Check if a password is the default password (plain or hashed).
 */
export async function isDefaultPassword(stored: string): Promise<boolean> {
  if (isBcryptHash(stored)) {
    return comparePassword(DEFAULT_PASSWORD, stored);
  }
  return stored === DEFAULT_PASSWORD;
}

/**
 * Get a hashed version of the default password.
 */
export async function getHashedDefaultPassword(): Promise<string> {
  return hashPassword(DEFAULT_PASSWORD);
}

export { DEFAULT_PASSWORD };
