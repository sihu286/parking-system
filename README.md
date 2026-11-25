# 🅿️ 주차 관제 시스템

![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB) ![FastAPI](https://img.shields.io/badge/FastAPI-009688) ![MySQL](https://img.shields.io/badge/MySQL-4479A1)

> 무게 센서로 주차면의 점유 여부를 확인하고, 장애인 전용 주차면에서는 RFID 태그를 등록 차량 및 입차 기록과 대조합니다. 관리자는 웹 대시보드에서 주차 현황을 확인하고 이상 상황을 처리할 수 있습니다.

## 주요 기능 (Key Features)

### 1. 입·출차 기록과 주차면 모니터링

- 차량번호로 입차와 출차를 기록합니다.
- 무게 센서가 보내는 점유 신호에 따라 주차면 상태를 갱신합니다. 모니터링 화면에서 어느 자리가 비어 있고 어느 구역에서 이상이 감지됐는지 확인할 수 있습니다.

### 2. 장애인 전용 주차면 RFID 검증

- 차량 등록 화면에서 장애인 차량의 차량번호, RFID 태그, 유효기간을 등록합니다.
- 전용 주차면에서 감지한 태그를 등록 정보 및 현재 입차 기록과 대조합니다. 태그를 읽지 못하면 해당 주차면을 **이상**으로 표시하고 **미인식** 위반 기록을 남깁니다.

### 3. 이상 상황 처리와 운영 통계

- 이상 상황 관리 화면에서 위반 내역을 기간별로 조회하고 처리 상태를 갱신합니다. 장비 오류는 별도 화면에서 조회하고 처리할 수 있습니다.
- 통계 화면에서 선택한 기간의 입·출차 추이, 위반 유형별 비율, 최근 기록을 확인합니다.

## 기술 스택 (Tech Stack)

| 구성 | 사용 기술 |
| --- | --- |
| 웹 화면 | Jinja2, HTML, CSS, JavaScript |
| API 서버 | Python 3.11, FastAPI, Uvicorn |
| 데이터 저장 | MySQL, SQLAlchemy, PyMySQL |
| DB 연결 및 배포 | Google Cloud SQL Python Connector, Docker |

## 📂 폴더 구조 (Directory Structure)

```text
parking-system/
├── app/
│   ├── main.py          # FastAPI 진입점과 화면 라우팅
│   ├── api/routes/      # 센서, 입·출차, 모니터링 등 API
│   ├── services/        # RFID 검증, 위반 처리, 통계 집계
│   ├── crud/            # 데이터 조회 및 변경
│   ├── models/          # SQLAlchemy 테이블 모델
│   ├── schemas/         # API 요청·응답 데이터 구조
│   ├── db/              # 데이터베이스 연결 및 세션 관리
│   ├── templates/       # 화면별 HTML 템플릿
│   └── static/          # JavaScript, CSS, 이미지
├── Dockerfile
└── requirements.txt
```

## 로컬 실행 (Windows PowerShell)

**사전 준비** · Python 3.11과 Google Cloud 애플리케이션 기본 사용자 인증 정보(ADC)가 필요합니다. 프로젝트 테이블이 준비된 Cloud SQL for MySQL 인스턴스의 연결 이름, DB 사용자, 비밀번호, 데이터베이스 이름을 각각 `INSTANCE_CONNECTION_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` 환경변수로 설정합니다.

프로젝트 루트에서 다음 명령을 실행합니다.

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8080
```

서버가 시작되면 [로그인 화면](http://127.0.0.1:8080/login)을 엽니다. 센서 및 차량 연동에 필요한 요청 형식은 [API 문서](http://127.0.0.1:8080/docs)에서 확인할 수 있습니다.
