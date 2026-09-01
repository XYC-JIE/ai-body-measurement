from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    # 数据库配置
    DATABASE_URL: str = "mysql+pymysql://root:123456@localhost/body_measurement"

    # JWT配置
    SECRET_KEY: str = "qwertsdfsdfsfsfwer"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7天

    # 上传配置
    UPLOAD_DIR: str = os.path.join(os.getcwd(), "uploads")
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: set = {"jpg", "jpeg", "png"}

    # 可视化图片配置 - 存储到 static/annotations 目录
    ANNOTATED_IMAGES_DIR: str = os.path.join(os.getcwd(), "static", "annotations")
    ANNOTATED_IMAGES_URL_PREFIX: str = "/api/static/annotations"

    class Config:
        env_file = ".env"


settings = Settings()