from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    prod_database_url: str = ""
    allowed_origins: str = "http://localhost:3000"
    anthropic_api_key: str = ""
    llm_provider: str = "anthropic"
    aws_s3_bucket: str = "r-on-it-common"
    aws_s3_prefix: str = "recipes/media/images"
    aws_region: str = "eu-central-1"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
