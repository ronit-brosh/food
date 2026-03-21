from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    prod_database_url: str = ""
    allowed_origins: str = "http://localhost:3000"
    anthropic_api_key: str = ""
    llm_provider: str = "anthropic"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
