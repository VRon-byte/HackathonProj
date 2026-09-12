"""Configuration shared by the backend.

Values come from environment variables, normally backend/.env.  Keeping
configuration here prevents database credentials and Auth0 settings from
being scattered through route handlers.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    auth0_domain: str
    auth0_audience: str
    auth0_issuer: str
    frontend_origins: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        """Turn the comma-separated CORS setting into a list."""
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


settings = Settings()
