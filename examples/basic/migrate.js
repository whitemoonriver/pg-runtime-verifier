import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for the synthetic example.");

const client = new Client({ connectionString });
await client.connect();
try {
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'app_owner') THEN
        CREATE ROLE app_owner NOLOGIN;
      END IF;
    END
    $$;

    CREATE TABLE IF NOT EXISTS public.accounts (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      email text NOT NULL UNIQUE,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    );

    ALTER TABLE public.accounts
      ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

    CREATE INDEX IF NOT EXISTS accounts_active_created_at_idx
      ON public.accounts (created_at)
      WHERE is_active;

    ALTER TABLE public.accounts OWNER TO app_owner;

    REVOKE ALL ON TABLE public.accounts FROM PUBLIC;
    REVOKE ALL ON TABLE public.accounts FROM app_user;
    GRANT SELECT, INSERT ON TABLE public.accounts TO app_user;
  `);
} finally {
  await client.end();
}
