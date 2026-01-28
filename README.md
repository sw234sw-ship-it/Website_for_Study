# Firebase AI Briefing Skeleton

## Prerequisites
- Node.js 18+
- Firebase CLI (`npm i -g firebase-tools`)

## Setup
```bash
# From repo root
cd firebase-functions
npm install

cd ../web
npm install
```

## RSS config
Edit `config/rss_feeds.json` and replace placeholders with real RSS URLs per topic.
- If a URL is still a placeholder (e.g., `<RSS_URL_1>`), the ingest job will skip it and log only.

## DCInside config
Edit `config/dc_galls.json` and replace placeholders with real gallery info.
- Placeholder entries are skipped and only logged.

## LLM secret setup (Cloud)
1) Create a secret in Secret Manager
```bash
gcloud secrets create LLM_API_KEY --replication-policy="automatic"
```
2) Add the key value
```bash
echo -n "YOUR_API_KEY" | gcloud secrets versions add LLM_API_KEY --data-file=-
```
3) Configure environment variables for Functions
```bash
firebase functions:config:set llm.enabled=true llm.endpoint="https://your-llm-endpoint" llm.model="your-model" llm.secret="LLM_API_KEY"
```

## LLM local testing (emulator)
For local testing, you can use environment variables (do not commit them):
```bash
export LLM_ENABLED=true
export LLM_ENDPOINT="https://your-llm-endpoint"
export LLM_MODEL="your-model"
export LLM_API_KEY="your-api-key"
```
If `LLM_API_KEY_SECRET` is set, the function will read from Secret Manager instead of the env var.
You can also set `llm.secret` in functions config to the Secret Manager name.

## Local development
### Start emulators (Firestore + Functions + Hosting)
```bash
# From repo root
firebase emulators:start
```

### Run RSS ingest locally (emulator)
1) Put real RSS URLs in `config/rss_feeds.json`
2) Build functions
```bash
cd firebase-functions
npm run build
```
3) Trigger scheduled function manually from emulator UI
- Open Emulator UI at http://localhost:4000
- Functions 탭에서 `dailyPipeline` 실행

## Daily pipeline (KST)
- `dailyPipeline` runs once per day and enforces order: RSS → DCInside → generate.

### Run web dev server
```bash
# In another terminal
cd web
npm run dev
```

## Build & deploy
```bash
# Build functions
cd firebase-functions
npm run build

# Build web
cd ../web
npm run build

# Deploy everything
cd ..
firebase deploy
```

## Notes
- Never place API keys in the frontend. Store secrets in Secret Manager and access them from Cloud Functions only.

## Firestore TTL policy (sources)
Sources include `expiresAt` (Timestamp) for 14-day retention. To enable automatic cleanup:
1) In Firebase Console → Firestore → TTL 정책
2) Add TTL field: `expiresAt`
3) Select Timestamp/Date mode and enable policy

If TTL is not enabled, use a scheduled cleanup job instead.
