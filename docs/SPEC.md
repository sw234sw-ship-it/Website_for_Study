# 하루 1회 자동 발행 AI 기자 브리핑 사이트 SPEC

## 1) 목표 / 비목표
### 목표
- 거시경제/AI/배터리 3개 분야에 대해 **매일 KST 기준 1회 자동 발행**되는 브리핑형 기사 제공
- 각 기사 **본문 800~1500자** 범위 자동 보장(초과 시 자동 축약)
- **최근 72시간** 내 공개된 소스만 수집해 최신성 유지
- **출처 최소 5개** 링크 제공 및 “사실/해석” 구분 라벨링
- 커뮤니티(DCInside)는 **참고 신호**로만 별도 섹션 처리
- 원문 링크/제목/요약/발행시각 필수 저장

### 비목표
- 유료 뉴스 API 계약/유료 데이터 연동
- 실시간 스트리밍/분 단위 업데이트
- 댓글, 사용자 계정, 개인화 추천
- 기사에 대한 법적 자문/투자 자문 제공

---

## 2) 사용자 플로우
- 홈
  - 상단 탭: 거시경제 / AI / 배터리
  - 선택한 토픽의 최신 기사 목록(날짜/제목/요약)
- 기사 상세
  - 요약
  - 사실 섹션
  - 해석 섹션
  - 커뮤니티 신호(DCInside) 섹션
  - 출처 링크(최소 5개)

---

## 3) 데이터 수집 규격
### 수집 범위
- 기준 시각: 스케줄 실행 시각(KST)
- 대상: 최근 72시간 이내 발행 기사/포스트

### 소스
- 무료 뉴스 API 또는 RSS 또는 SERP
- DCInside: 커뮤니티 신호 수집용

### 중복 제거
- 1차: URL 정규화(UTM/트래킹 파라미터 제거)
- 2차: 제목 유사도(예: Jaccard/TF-IDF cosine ≥ 0.85)
- 3차: 본문 요약 해시(요약 텍스트 해시 일치 시 제거)

### 점수화(랭킹)
- 기본 점수: 최신성 가중치(발행 후 경과시간)
- 신뢰도 가중치: 출처 도메인 품질 점수
- 주제 적합도: 키워드/분류 모델 스코어
- 커뮤니티 신호: DCInside 언급량/상승 추세는 **별도 보조 지표**로만 사용

### 저장 필드(필수)
- 원문 링크(url)
- 제목(title)
- 요약(summary)
- 발행시각(publishedAt)

---

## 4) 기사 작성 규격
### 섹션 템플릿
1. 헤더
   - 제목
   - 발행일(KST)
   - 요약(2~3문장)
2. 사실(FACT)
   - 핵심 사실 3~6개 bullet
3. 해석(ANALYSIS)
   - 시장/산업 관점 해석 2~4개 bullet
4. 커뮤니티 신호(DCInside)
   - 트렌드 요약(사실 근거 아님, 참고용)
5. 출처 링크
   - 최소 5개 링크 나열

### 라벨링 규칙
- “사실(FACT)”과 “해석(ANALYSIS)” 명시 라벨
- 커뮤니티 신호는 **FACT로 분류 금지**

### 분량 규칙
- 본문 800~1500자 목표
- 1500자 초과 시 자동 축약(요약 압축 우선)

---

## 5) Firestore 스키마 + 인덱스 계획
### collections
#### articles
- id: string
- topic: "macro" | "ai" | "battery"
- title: string
- summary: string
- content: string (본문)
- factSection: string[]
- analysisSection: string[]
- communitySection: string
- sources: { title, url, publishedAt, domain }[]
- publishedAt: timestamp (기사 발행 시각)
- createdAt: timestamp
- updatedAt: timestamp
- sourceCount: number
- wordCount: number

#### sources
- id: string
- topic: string
- title: string
- url: string
- publishedAt: timestamp
- fetchedAt: timestamp
- summary: string
- domain: string
- score: number
- dedupeKey: string
- rawText: string (선택)

#### jobs
- id: string
- jobType: "collect" | "summarize" | "publish"
- topic: string
- status: "queued" | "running" | "success" | "failed"
- scheduledAt: timestamp
- startedAt: timestamp
- finishedAt: timestamp
- error: string
- retryCount: number

### 인덱스 계획
- articles: (topic, publishedAt desc)
- sources: (topic, publishedAt desc), (topic, score desc)
- jobs: (jobType, status, scheduledAt desc)

---

## 6) 보안
- API 키는 **서버에만 저장**
- Secret Manager 사용
- 클라이언트에는 키/토큰 미노출
- Cloud Functions에서만 외부 API 호출

---

## 7) 운영
- 스케줄: 매일 KST 기준 07:00 수집/작성/발행(예시)
- 실패 재시도: 최대 3회, 지수 백오프(5m/15m/60m)
- 로깅: 작업 단계별 로그(수집/요약/발행), 오류 스택 보존
- 모니터링: 실패 알림(예: Slack/Email) 연동 가능

---

## 8) Acceptance Criteria (테스트 가능한 문장 12개)
1. 매일 KST 07:00에 3개 토픽 기사 생성 작업이 시작된다.
2. 각 기사에 저장된 sourceCount는 5 이상이다.
3. 기사 본문 길이는 800~1500자 범위에 있다.
4. 각 기사에는 FACT와 ANALYSIS 섹션이 모두 존재한다.
5. 커뮤니티 섹션은 FACT로 분류되지 않는다.
6. 수집된 소스는 72시간 이내 발행 건만 포함한다.
7. 중복된 원문 링크(URL)는 sources 컬렉션에 단일 건만 저장된다.
8. articles 컬렉션에는 url, title, summary, publishedAt이 모두 저장된다.
9. 출처 링크 섹션에는 최소 5개의 링크가 노출된다.
10. API 키는 클라이언트에서 접근 불가하다.
11. 실패한 작업은 최대 3회 재시도 후 failed 상태로 기록된다.
12. 홈 화면에서 토픽 탭 전환 시 해당 토픽의 최신 기사 목록이 노출된다.
