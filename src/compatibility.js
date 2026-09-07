export const MIN_POSTGRES_MAJOR = 16;
export const MAX_POSTGRES_MAJOR = 18;
export const SUPPORTED_POSTGRES_MAJORS = Object.freeze([16, 17, 18]);

export class PostgresCompatibilityError extends Error {
  constructor(message) {
    super(message);
    this.name = "PostgresCompatibilityError";
  }
}

export function postgresMajorFromVersionNum(serverVersionNum) {
  if (!Number.isInteger(serverVersionNum) || serverVersionNum <= 0) {
    throw new PostgresCompatibilityError("PostgreSQL server_version_num must be a positive integer.");
  }
  return Math.floor(serverVersionNum / 10000);
}

export function assertPostgresCompatibility(database, config) {
  const major = postgresMajorFromVersionNum(database.serverVersionNum);
  if (major < MIN_POSTGRES_MAJOR || major > MAX_POSTGRES_MAJOR) {
    throw new PostgresCompatibilityError(
      `PostgreSQL ${major} is outside the supported range ${MIN_POSTGRES_MAJOR}-${MAX_POSTGRES_MAJOR}.`,
    );
  }

  if (major < 17 && config.verify.privileges.some((item) => item.privilege === "MAINTAIN")) {
    throw new PostgresCompatibilityError("The MAINTAIN table privilege requires PostgreSQL 17 or newer.");
  }

  return { major };
}
