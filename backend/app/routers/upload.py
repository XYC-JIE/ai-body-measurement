from fastapi import APIRouter, UploadFile, File
import os
from datetime import datetime
import uuid

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # 生成唯一文件名
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    
    # 按日期组织文件夹
    today = datetime.now().strftime("%Y%m%d")
    save_dir = os.path.join(UPLOAD_DIR, today)
    os.makedirs(save_dir, exist_ok=True)
    
    # 保存文件
    file_path = os.path.join(save_dir, unique_filename)
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # 转换为URL格式的路径
    url_path = file_path.replace('\\', '/')
    return {
        "url": url_path
    }