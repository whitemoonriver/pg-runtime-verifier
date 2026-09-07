const POSTGRES_URI_CREDENTIALS = /\b(postgres(?:ql)?:\/\/[^:\s/@]+):([^@\s/]+)@/gi;
const PASSWORD_ASSIGNMENT = /\b(password|passwd|pwd)\s*[:=]\s*([^\s,;]+)/gi;

export function sanitizeText(value, secrets = []) {
  let text = String(value ?? "");
  for (const secret of secrets) {
    if (typeof secret === "string" && secret.length >= 4) text = text.split(secret).join("[REDACTED]");
  }
  text = text.replace(POSTGRES_URI_CREDENTIALS, (_match, prefix) => `${prefix}:[REDACTED]@`);
  text = text.replace(PASSWORD_ASSIGNMENT, (_match, label) => `${label}=[REDACTED]`);
  return text;
}
