import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  // Support legacy plaintext passwords during migration
  if (!hashed.startsWith("$2a$") && !hashed.startsWith("$2b$")) {
    return plain === hashed;
  }
  return bcrypt.compare(plain, hashed);
}
