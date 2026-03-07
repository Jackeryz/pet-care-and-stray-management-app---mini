const DEV_FALLBACK_JWT_SECRET = "dev-insecure-jwt-secret-change-me";

export function getJwtSecret(): string {
  const key = process.env.JWT_SECRET;
  if (key && key.trim().length > 0) {
    return key;
  }

  console.warn(
    "⚠️ JWT_SECRET is not set. Falling back to an insecure development secret. Set JWT_SECRET in backend/.env for production."
  );
  return DEV_FALLBACK_JWT_SECRET;
}
