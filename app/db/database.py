import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from google.cloud.sql.connector import Connector
import pymysql


connector = Connector()

##GCP 인스턴스에 pymysql 방식으로 접속한다
def getconn():
    conn = connector.connect(
        os.environ["INSTANCE_CONNECTION_NAME"],
        "pymysql",
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        db=os.environ["DB_NAME"],
    )
    return conn

## SQLAlchemy 엔진 생성
engine = create_engine(
    "mysql+pymysql://",
    creator=getconn,
    pool_pre_ping=True, ##DB 연결확인
)

## 세션 생성
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

##의존성 주입
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
