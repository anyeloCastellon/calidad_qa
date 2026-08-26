import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DB = os.path.join(BASE_DIR, "data", "qa_shop.db")


class Config:
    DATABASE_PATH = os.environ.get("DATABASE_PATH", DEFAULT_DB)
    SECRET_KEY = os.environ.get("SECRET_KEY", "qa-shop-lab-local")
    REPORT_SYNC_DELAY = float(os.environ.get("REPORT_SYNC_DELAY", "2"))
    JSON_AS_ASCII = False
    APP_VERSION = "1.0.0"
