from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import auth, measurement, upload, bmi
from app.database import engine, Base
import logging
import os

# 配置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI身体测量API",
    description="AI身体测量后端服务接口文档",
    version="1.0.0",
    debug=True,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

@app.on_event("startup")
async def startup_event():
    logger.info("应用启动")
    try:
        # 确保上传目录和可视化图片目录存在
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        os.makedirs(settings.ANNOTATED_IMAGES_DIR, exist_ok=True)

        Base.metadata.create_all(bind=engine)
        logger.info("数据库表创建成功")
    except Exception as e:
        logger.error(f"数据库表创建失败: {str(e)}")

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件目录
uploads_dir = os.path.join(os.getcwd(), "uploads")
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# 挂载可视化图片目录 - static/annotations
annotated_dir = settings.ANNOTATED_IMAGES_DIR
if not os.path.exists(annotated_dir):
    os.makedirs(annotated_dir)
app.mount("/api/static/annotations", StaticFiles(directory=annotated_dir), name="annotations")

# 注册所有路由
app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(bmi.router, prefix="/api/bmi", tags=["bmi计算"])
app.include_router(measurement.router, prefix="/api/measurement", tags=["测量"])
app.include_router(upload.router, prefix="/api/upload", tags=["上传"])

@app.get("/")
async def root():
    logger.info("访问根路由")
    return {"message": "测试成功"}