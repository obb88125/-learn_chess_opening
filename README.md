# Chess Opening Recognition Web App

React + Express + SQLite 기반 웹 앱입니다.

## 기능

- 브라우저에서 체스 보드 플레이
- 한 수가 끝날 때마다 현재 오프닝 이름과 ECO 코드를 자동 인식
- 알려진 오프닝 메인라인과 현재 위치에서의 남은 수를 보여줌
- SQLite에 오프닝 DB를 저장하고 게임 기록을 남김

## 설치 및 실행

1. 프로젝트 루트로 이동

```bash
cd c:\20260601
```

2. 의존성 설치

```bash
npm install
```

3. 개발 서버 실행

```bash
npm run dev
```

4. 브라우저에서 접속

```bash
http://localhost:5173
```

5. 백엔드 Express 서버 실행

```bash
npm run serve
```

## 빌드 및 배포

```bash
npm run build
npm run serve
```

## 데이터베이스

- `chess_openings.db` 파일이 생성됩니다.
- `openings` 테이블에 기본 오프닝 데이터가 저장됩니다.
- `/api/opening` 엔드포인트로 오프닝 매칭을 수행합니다.
- `/api/log` 엔드포인트로 게임 기록을 저장합니다.
