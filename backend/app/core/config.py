"""Application settings.

Everything sensitive or environment-specific comes from the environment
(or backend/.env in local dev — see backend/.env.example). There are NO
secret defaults in source; the app refuses to boot without DATABASE_URL.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- database (required — no fallback, see SECURITY.md S8) ---
    DATABASE_URL: str

    # --- auth ---
    # Project URL, e.g. https://<ref>.supabase.co — used to fetch the JWKS
    # for asymmetric JWT verification (new Supabase projects).
    SUPABASE_URL: str = ""
    # Legacy HS256 JWT secret (Supabase dashboard → API → JWT secret).
    # Only needed for projects still issuing HS256 tokens.
    SUPABASE_JWT_SECRET: str = ""
    # Service-role key for admin actions (e.g. creating auth users).
    # Supabase dashboard → Settings → API → service_role (secret).
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    # Escape hatch for local development with no Supabase project at all.
    # NEVER enable in production: every request is treated as an Owner.
    AUTH_DISABLED: bool = False

    # HMAC secret for the rotating check-in QR (see app/core/checkin.py).
    # The QR endpoints refuse to serve without it.
    CHECKIN_SECRET: str = ""

    # --- http ---
    # Comma-separated list of allowed browser origins.
    ALLOWED_ORIGINS: str = "http://localhost:8081,http://localhost:19006"

    ENV: str = "development"

    class Config:
        env_file = ".env"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()
