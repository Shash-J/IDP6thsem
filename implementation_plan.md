# TuringSight — Full Pipeline Requirements Audit & Implementation Plan

**Date**: June 26, 2026 | **Role**: Founding Engineer  
**Scope**: All 3 repositories — [LogGen_pipeline](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline), [TuringSight](file:///C:/Users/Shashanka/Desktop/TuringSight), [TuringSight-WebApp](file:///C:/Users/Shashanka/Desktop/TuringSight-WebApp)

---

## 1. Functional Requirements — Status Matrix

### A. Edge Pipeline (LogGen_pipeline)

| # | Requirement | Status | Evidence |
|---|---|---|---|
| F1 | **RTSP Stream Ingestion** — Capture live CCTV frames via RTSP at ~10 FPS in a background thread | ✅ Done | [stream_reader.py](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/ingestion/stream_reader.py) — threaded reader with auto-reconnect |
| F2 | **Motion Detection** — Background subtraction (MOG2) with configurable threshold, min area, sustained frame count | ✅ Done | [motion.py](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/ingestion/motion.py) — dual-threshold candidate motion check |
| F3 | **Object Validation (YOLOv8)** — Filter false motion triggers by verifying person/object presence | ✅ Done | [edge_ai.py](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/ingestion/edge_ai.py) — YOLOv8-Nano with target class filtering |
| F4 | **Centroid Tracking** — Track occupant movement for translocation detection across frames | ✅ Done | [main.py L157-264](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/main.py#L157-L264) — `CentroidTracker` with euclidean distance matching |
| F5 | **Video Compilation** — Compile H.264 MP4 clips from motion event frames with temporal compression support | ✅ Done | [video_compiler.py](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/ingestion/video_compiler.py) |
| F6 | **VLM Inference — Gemini API** — Send video clips to Gemini 2.5 Flash for narrative log generation | ✅ Done | [gemini_client.py](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/processor/gemini_client.py) — with retry wrapper |
| F7 | **VLM Inference — Local VLM (vLLM/Qwen)** — Process clips via local GPU-loaded model | ✅ Done | [local_vlm_client.py](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/processor/local_vlm_client.py) |
| F8 | **VLM Inference — Remote VLM (shared GPU server)** — Route clips to shared vLLM HTTP endpoint | ✅ Done | [remote_vlm_client.py](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/processor/remote_vlm_client.py) |
| F9 | **VLM Router Factory** — Auto-detect and route to Local → Remote → Gemini API with fallback chain | ✅ Done | [processor_factory.py](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/processor/processor_factory.py) |
| F10 | **Stateful Room Memory** — Maintain persistent room state (occupants, objects) in `local_state.json` across clips | ✅ Done | [state_manager.py](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/processor/state_manager.py) |
| F11 | **Camera Manifest (YAML)** — Per-camera spatial anchors, anomaly rules, working hours, motion tuning | ✅ Done | [cam_office_304_manifest.yaml](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/config/cam_office_304_manifest.yaml) |
| F12 | **S3 Video Upload** — Upload MP4 event clips to S3 with minimum duration threshold | ✅ Done | [main.py L27-60](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/main.py#L27-L60) |
| F13 | **MQTT Log Shipping** — Tail JSONL log file and publish new entries to AWS IoT Core via mTLS | ✅ Done | [shipper.py](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/shipper.py) — port 443 ALPN, TLS cert auth |
| F14 | **Heartbeat Mechanism** — Periodic idle room status captures sent to VLM during no-motion periods | ✅ Done | [main.py L652-678](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/main.py#L652-L678) — working hours / off-hours adaptive intervals |
| F15 | **MQTT Heartbeat Telemetry** — Periodic CPU/RAM/status metrics published to `cctv/heartbeat/{cam_id}` | ✅ Done | [heartbeat.py](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/utils/heartbeat.py) |
| F16 | **HTTP Health Check Server** — Expose `/health` endpoint for Docker HEALTHCHECK and external monitoring | ✅ Done | [health.py](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/utils/health.py) — stream reader, queue depth, VLM reachability |
| F17 | **JSONL Log Rotation** — Auto-rotate log file when exceeding 50MB limit, retain up to 5 backups | ✅ Done | [main.py L63-101](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/main.py#L63-L101) |
| F18 | **Temp Directory Pruning** — Delete oldest clips when temp storage exceeds configurable MB limit | ✅ Done | [main.py L104-154](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/main.py#L104-L154) |
| F19 | **Graceful Shutdown** — Cooperative shutdown via threading.Event for all background threads | ✅ Done | [main.py L681-721](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/main.py#L681-L721) |
| F20 | **Multi-Camera Docker Orchestration** — Run N camera agents sharing one vLLM GPU container | ✅ Done | [docker-compose.gpu.yml](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/docker-compose.gpu.yml), [docker-compose.multi.yml](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/docker-compose.multi.yml) |
| F21 | **Holiday Calendar Awareness** — Skip or modify behavior on holidays using `holidays` library | ✅ Done | [settings.py L244-278](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/config/settings.py#L244-L278) |
| F22 | **Dynamic Camera Config via Environment** — Per-camera `.env` override, camera manifest YAML, CLI args | ✅ Done | [settings.py L1-36](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/config/settings.py#L1-L36) |

---

### B. Cloud Backend (TuringSight)

| # | Requirement | Status | Evidence |
|---|---|---|---|
| F23 | **IoT Ingest Lambda** — Receive MQTT payloads, write to DynamoDB Logs-V2, update Camera-States | ✅ Done | [lambda_ingest/lambda_function.py](file:///C:/Users/Shashanka/Desktop/TuringSight/lambda_ingest/lambda_function.py) |
| F24 | **Embedding Processor Lambda** — DynamoDB Streams trigger → Gemini embedding → Qdrant upsert | ✅ Done | Terraform references `lambda_embedding_final.zip`; controlled by camera registry toggle |
| F25 | **Query Handler Lambda** — Central API lambda with 10 route handlers | ✅ Done | [lambda_queryhandler/lambda_function.py](file:///C:/Users/Shashanka/Desktop/TuringSight/lambda_queryhandler/lambda_function.py) — 1605 lines |
| F26 | **Dual-Phase Query Routing** — ≤20 logs: direct DynamoDB scan → Gemini; >20 logs: Qdrant RAG | ✅ Done | Functions `fetch_logs_from_dynamodb_range()` and `search_qdrant()` |
| F27 | **Natural Language Time Parsing** — Parse "last 3 hours", "yesterday morning", "between 2pm and 5pm" | ✅ Done | `parse_query_time_range_programmatic()` + `parse_query_time_range()` (Gemini fallback) |
| F28 | **S3 Video Presigning** — Generate time-limited presigned URLs for playback in the dashboard | ✅ Done | `generate_presigned_video_url()` with 1hr expiry |
| F29 | **Cognito RBAC** — Admin group gets full camera scope; regular users scoped to `User-Cameras` table | ✅ Done | `get_user_role()`, `get_authorized_cameras()` |
| F30 | **Admin: Register Camera** — POST /admin/cameras to create camera entries in Registry table | ✅ Done | `admin_register_camera()` |
| F31 | **Admin: Update Camera Controls** — Toggle embedding, video upload, min duration per camera | ✅ Done | `admin_update_camera_controls()` |
| F32 | **Admin: Manage User Access** — Grant/revoke camera access to users via User-Cameras table | ✅ Done | `admin_manage_user_access()` |
| F33 | **Camera Registry API** — List cameras with live status, last event time, specs | ✅ Done | `list_cameras()`, `admin_list_cameras()` |
| F34 | **Latest Activity Scoping** — Auto-detect "latest/most recent" queries, scope to single newest log | ✅ Done | `is_latest_activity_query()` + descending sort with Limit=1 |
| F35 | **Structured Summary Extraction** — Auto-extract activity counts, key events, anomaly summaries for LLM prompts | ✅ Done | `extract_structured_summary()` |
| F36 | **Terraform IaC** — All AWS resources (DDB, Lambda, API GW, Cognito, S3, IoT, EC2) declared in Terraform | ✅ Done | [main.tf](file:///C:/Users/Shashanka/Desktop/TuringSight/terraform-project/main.tf) — 730 lines |
| F37 | **DynamoDB Streams → Embedding Pipeline** — Event source mapping from Logs-V2 to Embedding Lambda | ✅ Done | Terraform `aws_lambda_event_source_mapping` resource |
| F38 | **IoT Topic Rule** — SQL rule `SELECT * FROM 'cctv/logs/+'` triggering Ingest Lambda | ✅ Done | Terraform `aws_iot_topic_rule` resource |

---

### C. Frontend Dashboard (TuringSight-WebApp)

| # | Requirement | Status | Evidence |
|---|---|---|---|
| F39 | **Cognito Authentication** — AWS Amplify sign-in/sign-up with SRP, session persistence, token refresh | ✅ Done | [auth.js](file:///C:/Users/Shashanka/Desktop/TuringSight-WebApp/src/services/auth.js), [App.jsx](file:///C:/Users/Shashanka/Desktop/TuringSight-WebApp/src/App.jsx) |
| F40 | **Camera Sidebar** — List assigned cameras with status indicators, persist last-selected camera | ✅ Done | [Dashboard.jsx](file:///C:/Users/Shashanka/Desktop/TuringSight-WebApp/src/pages/Dashboard.jsx) — localStorage persistence |
| F41 | **Latest Log Card** — Real-time display of most recent camera event with anomaly highlighting | ✅ Done | [LatestLogCard.jsx](file:///C:/Users/Shashanka/Desktop/TuringSight-WebApp/src/components/LatestLogCard.jsx) |
| F42 | **Natural Language Query Panel** — Ask AI questions with time window presets (1h/6h/24h/custom/all) | ✅ Done | [QueryPanel.jsx](file:///C:/Users/Shashanka/Desktop/TuringSight-WebApp/src/components/QueryPanel.jsx) |
| F43 | **Video Playback Modal** — In-browser H.264 MP4 playback from presigned S3 URLs | ✅ Done | [VideoModal.jsx](file:///C:/Users/Shashanka/Desktop/TuringSight-WebApp/src/components/VideoModal.jsx) |
| F44 | **Camera Specifications Display** — Show camera details, environment, tracking classes | ✅ Done | [CameraSpecs.jsx](file:///C:/Users/Shashanka/Desktop/TuringSight-WebApp/src/components/CameraSpecs.jsx) |
| F45 | **Admin Panel** — Register cameras, modify controls, manage user access (admin group only) | ✅ Done | [AdminPanel.jsx](file:///C:/Users/Shashanka/Desktop/TuringSight-WebApp/src/pages/AdminPanel.jsx) — 358 lines |
| F46 | **Responsive Mobile UI** — Mobile drawer sidebar, swipe navigation, body scroll lock | ✅ Done | CSS + JS in Dashboard.jsx |
| F47 | **Admin Group Detection** — Auto-detect Cognito admin group from JWT claims | ✅ Done | `fetchAuthSession()` in Dashboard.jsx |
| F48 | **API Interceptor** — Auto-inject JWT Authorization header on every API request | ✅ Done | [api.js](file:///C:/Users/Shashanka/Desktop/TuringSight-WebApp/src/services/api.js) |

---

## 2. Non-Functional Requirements — Status Matrix

### A. Performance & Scalability

| # | Requirement | Status | Notes |
|---|---|---|---|
| NF1 | **Multi-camera on single hardware** — N cameras sharing 1 GPU vLLM server, each using ≤0.5 CPU + 512MB RAM | ✅ Done | `docker-compose.gpu.yml` deploys `cam_office_304` and `cam_warehouse_101` as CPU containers sharing `vlm_inference` |
| NF2 | **Non-blocking async event queue** — Decouple stream capture from VLM inference via `queue.Queue` | ✅ Done | `processing_queue` in [main.py L397](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/main.py#L397) |
| NF3 | **DynamoDB auto-scaling (PAY_PER_REQUEST)** — All tables use on-demand billing | ✅ Done | Terraform `billing_mode = "PAY_PER_REQUEST"` for all 5 DynamoDB tables |
| NF4 | **VLM GPU Memory Utilization** — Qwen2.5-VL-7B uses ~17.8GB / 23GB (77%) on L4 with 5GB headroom | ✅ Done | Verified in GCP GPU VM deployment (June 26, 2026 11:00 AM) |
| NF5 | **Lambda cold start optimization** — Query handler Lambda has 512MB RAM, 30s timeout | ⚠️ Partial | 30s timeout may be insufficient for Gemini RAG queries with large log counts; consider increasing to 60s |

### B. Reliability & Fault Tolerance

| # | Requirement | Status | Notes |
|---|---|---|---|
| NF6 | **VLM Fallback Chain** — Local VLM → Remote VLM → Gemini API fallback | ✅ Done | `ProcessorFactory` chains three clients with exception-based fallback |
| NF7 | **Gemini API Retry with Backoff** — Retry 503/quota errors with configurable delay | ✅ Done | `_generate_content_with_retry()` in gemini_client.py |
| NF8 | **MQTT Reconnection** — Exponential backoff reconnect on broker disconnection | ✅ Done | [shipper.py L78-92](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/shipper.py#L78-L92) |
| NF9 | **Stream Reader Auto-Reconnect** — Reconnect to RTSP on disconnection with backoff | ✅ Done | Reconnect logic in `stream_reader.py` |
| NF10 | **Docker restart policy** — All containers have `restart: unless-stopped` | ✅ Done | All compose files specify restart policy |
| NF11 | **vLLM Health Check + Agent Dependency** — Camera agents wait for VLM health check before starting | ✅ Done | `depends_on: vlm-server: condition: service_healthy` in compose files |

### C. Security

| # | Requirement | Status | Notes |
|---|---|---|---|
| NF12 | **mTLS for MQTT** — TLS client certificate authentication for IoT Core | ✅ Done | X.509 cert auth in shipper.py |
| NF13 | **JWT Cognito Authorization** — All API Gateway routes require valid Cognito JWT | ✅ Done | Terraform `authorization_type = "JWT"` on all routes |
| NF14 | **Camera-scoped data access** — Regular users can only query cameras assigned to them | ✅ Done | `get_authorized_cameras()` filters via `User-Cameras` table |
| NF15 | **SSL/HTTPS for dashboard** — Let's Encrypt certificate on turingsight.online | ✅ Done | Certbot configured per [deployment.md](file:///C:/Users/Shashanka/Desktop/TuringSight-WebApp/docs/deployment.md#L105-L117) |
| NF16 | **Static AWS credentials on edge** — Edge `.env` contains hardcoded IAM keys | ❌ **Gap** | AWS Access Key `AKIAXWXWVH3YCEILDBL2` stored in plaintext in [.env](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/.env#L25-L26). If client hardware is compromised, all clients' S3 data is exposed. |
| NF17 | **Gemini API key on edge** — API key stored in edge `.env` | ❌ **Gap** | Key `AQ.Ab8RN6...` in plaintext. Compromised client hardware leaks API billing. |
| NF18 | **Source code exposure on client hardware** — Compose files use `build: .` requiring full repo clone | ❌ **Gap** | `docker-compose.gpu.yml` uses `build: context: .` — the entire Python codebase is present on client machine |

### D. Observability & Monitoring

| # | Requirement | Status | Notes |
|---|---|---|---|
| NF19 | **Structured JSON diagnostic logging** — All modules log to rotating files in `logs/` | ✅ Done | [logger.py](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/utils/logger.py) |
| NF20 | **CloudWatch Lambda Logging** — All 3 Lambdas have CloudWatch Log Groups | ✅ Done | Terraform declares log groups |
| NF21 | **Central Monitoring Dashboard** — Unified view of all edge agents, GPU status, queue depths, error rates | ❌ **Missing** | No centralized monitoring exists. Each agent is checked individually via SSH + curl. No alerting. |
| NF22 | **Edge Agent Metrics Aggregation** — Collect health data from all agents into a single view | ❌ **Missing** | Heartbeat data goes to IoT Core but is not visualized or aggregated anywhere |

### E. CI/CD & DevOps

| # | Requirement | Status | Notes |
|---|---|---|---|
| NF23 | **Edge Container CI** — Auto-build camera agent Docker image on push to main | ✅ Done | [build-and-push.yml](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/.github/workflows/build-and-push.yml) |
| NF24 | **Pre-build test execution** — Run pytest before building Docker image | ❌ **Missing** | Workflow builds immediately without running tests. Broken code ships to GHCR. |
| NF25 | **Edge auto-update** — Client VMs automatically pull and restart updated containers | ❌ **Missing** | Manual `docker compose pull && up -d` required. No watchtower or update daemon. |
| NF26 | **Backend Lambda CI/CD** — Auto-deploy Lambda code changes via GitHub Actions | ❌ **Missing** | Completely manual ZIP + `terraform apply` process |
| NF27 | **Frontend CI/CD** — Auto-deploy React build to hosting on push | ❌ **Missing** | Manual `deploy.ps1` or `deploy.sh` script via SSH/SCP |
| NF28 | **Container Registry Images** — Production compose files pull pre-built images from GHCR | ❌ **Missing** | All compose files still use `build: .` — requires source code on client hardware |
| NF29 | **Semantic versioning** — Git tags for releases | ❌ **Missing** | No git tags exist in any of the 3 repos |

### F. Documentation

| # | Requirement | Status | Notes |
|---|---|---|---|
| NF30 | **Architecture documentation** | ✅ Done | [architecture.md](file:///C:/Users/Shashanka/Desktop/TuringSight/docs/architecture.md) — comprehensive 5-layer Mermaid diagram |
| NF31 | **Data flow documentation** | ✅ Done | [data-flow.md](file:///C:/Users/Shashanka/Desktop/TuringSight/docs/data-flow.md) — 3 sequence diagrams with JSON schemas |
| NF32 | **API documentation** | ✅ Done | [api.md](file:///C:/Users/Shashanka/Desktop/TuringSight-WebApp/docs/api.md) — routes, auth flow, payload formats |
| NF33 | **GCP deployment playbook** | ✅ Done | [gcp_gpu_deployment.md](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/docs/gcp_gpu_deployment.md) |
| NF34 | **Development changelog** | ✅ Done | [development.md](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/docs/development.md) — timestamped milestone entries |

---

## 3. Infrastructure Status

| Resource | Provider | Status | Details |
|---|---|---|---|
| **GCP GPU VM** (`turingsight-client-gpu`) | GCP | 🟢 RUNNING | `g2-standard-4`, NVIDIA L4 24GB, `34.93.187.78`, `asia-south1-b` |
| **GCP CPU VM** (`turingsight-client-cpu`) | GCP | ⚫ TERMINATED | `e2-standard-4`, `asia-south1-a` — stopped to conserve credits |
| **Frontend EC2** | AWS | 🟢 Active | `13.232.99.55`, Nginx + SSL, `turingsight.online` |
| **Qdrant VPS** | AWS | 🟢 Active | `3.111.116.107:6333`, `t3.small`, Docker container |
| **API Gateway** | AWS | 🟢 Active | `vhnrzmf7qe.execute-api.ap-south-1.amazonaws.com/prod` |
| **Cognito User Pool** | AWS | 🟢 Active | `ap-south-1_NSjDsTZMV` |
| **DynamoDB (5 tables)** | AWS | 🟢 Active | Logs-V2, Camera-States, Camera-Registry, User-Cameras, Logs(v1) |
| **S3 Videos** | AWS | 🟢 Active | `turingsight-event-videos-529872010992` |
| **IoT Core** | AWS | 🟢 Active | Topic rule `core_dynamoLogic`, MQTT endpoint |

> [!NOTE]
> The GCP `gcloud` CLI is currently returning SSL certificate verification errors from this machine (likely proxy/firewall issue). The GPU VM `turingsight-client-gpu` is listed as RUNNING but could not be SSH'd into during this audit to verify container status.

---

## 4. Gap Analysis Summary

### 🔴 Critical Gaps (Security & Reliability)

| ID | Gap | Risk | Impact |
|---|---|---|---|
| **G1** | Static AWS IAM keys in edge `.env` (NF16) | **HIGH** — compromised client = full S3 read/write for all clients | Credential leak across all tenants |
| **G2** | Gemini API key in edge `.env` (NF17) | **HIGH** — compromised client = billing abuse | Unauthorized API spend |
| **G3** | Source code on client hardware (NF18, NF28) | **MEDIUM** — exposes proprietary IP (motion filters, VLM prompts, state logic) | IP theft, competitor reverse-engineering |

### 🟡 Important Gaps (Operational)

| ID | Gap | Risk | Impact |
|---|---|---|---|
| **G4** | No CI/CD test gate (NF24) | **MEDIUM** — broken code ships directly to production containers | Pipeline crashes at client sites |
| **G5** | No edge auto-update (NF25) | **MEDIUM** — every client requires manual SSH to update | O(N) manual effort per release |
| **G6** | No backend/frontend CI/CD (NF26, NF27) | **MEDIUM** — manual ZIPs and SSH/SCP deploys | Deployment drift, human error |
| **G7** | No central monitoring (NF21, NF22) | **MEDIUM** — agent failures invisible until client complains | Lost surveillance coverage |
| **G8** | No semantic versioning (NF29) | **LOW** — no release tracking, no rollback targets | Cannot rollback to known-good version |
| **G9** | Lambda timeout 30s (NF5) | **LOW** — RAG queries with complex time parsing + Gemini call may timeout | 504 errors on heavy queries |

---

## 5. Proposed Implementation Plan

### Phase 1: Secure the Edge (Critical Security — Immediate)

> [!CAUTION]
> Addresses G1, G2, G3 — static credentials and source code on client machines

#### [MODIFY] [docker-compose.gpu.yml](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/docker-compose.gpu.yml)
- Replace `build: context: . / dockerfile: Dockerfile.agent` with `image: ghcr.io/shash-j/turingsight-loggen-agent:latest` for all camera agent services
- Keep `vlm-server` using `image: vllm/vllm-openai:latest` (already a registry pull)

#### [MODIFY] [docker-compose.multi.yml](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/docker-compose.multi.yml)
- Same change — switch to GHCR image for camera agents

#### [MODIFY] [docker-compose.gcp-cpu.yml](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/docker-compose.gcp-cpu.yml)
- Same change — switch to GHCR image

#### [NEW] `deploy/client-bundle/` directory
- Create a minimal client deployment bundle containing ONLY: `docker-compose.gpu.yml`, `.env.template`, `config/` directory for camera manifests
- No Python source code, no Dockerfiles, no tests

---

### Phase 2: CI/CD Reliability (Addresses G4, G6, G8)

#### [MODIFY] [build-and-push.yml](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/.github/workflows/build-and-push.yml)
- Add `pytest` step before Docker build:
  ```yaml
  - name: Run unit tests
    run: |
      pip install -r requirements.agent.txt
      pip install pytest
      pytest tests/ -v --tb=short
  ```
- Add semantic version tagging support

#### [NEW] `.github/workflows/tag-release.yml` in LogGen_pipeline
- On git tag `v*`, create a GitHub Release with changelog

---

### Phase 3: Edge Auto-Update (Addresses G5)

#### [MODIFY] [docker-compose.gpu.yml](file:///C:/Users/Shashanka/Desktop/LogGen_pipeline/docker-compose.gpu.yml)
- Add Watchtower container to auto-pull and restart updated camera agent images:
  ```yaml
  watchtower:
    image: containrrr/watchtower
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_POLL_INTERVAL=300
      - WATCHTOWER_LABEL_ENABLE=true
    command: cam_office_304 cam_warehouse_101
  ```

---

### Phase 4: Central Monitoring (Addresses G7)

#### [NEW] Monitoring endpoint aggregation
- Build a lightweight monitoring Lambda or API endpoint that:
  1. Queries `TuringSight-Camera-States` for last-updated timestamps per camera
  2. Compares against expected heartbeat intervals
  3. Returns aggregated health status for all cameras across all clients
- Surface this in the Admin Panel as a "System Health" tab

#### [MODIFY] [AdminPanel.jsx](file:///C:/Users/Shashanka/Desktop/TuringSight-WebApp/src/pages/AdminPanel.jsx)
- Add a "System Health" section showing per-camera agent connectivity, last heartbeat time, and alert status

---

### Phase 5: Lambda Timeout Fix (Addresses G9)

#### [MODIFY] [main.tf](file:///C:/Users/Shashanka/Desktop/TuringSight/terraform-project/main.tf)
- Increase `TuringSight-LogHandler` Lambda timeout from 30s to 60s:
  ```hcl
  timeout = 60
  ```

---

## 6. Verification Plan

### Automated Tests
- `pytest tests/ -v` in LogGen_pipeline before each deployment
- Verify GitHub Actions workflow succeeds with test gate

### Manual Verification
- After Phase 1: Deploy client bundle to GPU VM, verify containers pull from GHCR without source code
- After Phase 3: Push a code change to `main`, verify Watchtower auto-updates the running container within 5 minutes
- After Phase 4: Check Admin Panel system health tab shows real-time camera statuses

---

## Open Questions

> [!IMPORTANT]
> **Q1**: For Phase 1 (credential security), should we implement AWS IoT Credentials Provider now (which requires restructuring the S3 upload to use temporary IAM credentials from the device certificate), or is it acceptable to move the S3 upload to a cloud-side Lambda (edge sends video bytes via MQTT or a separate upload endpoint)?

> [!IMPORTANT]  
> **Q2**: For Phase 4 (monitoring), should we build the monitoring dashboard as a new tab in the existing WebApp admin panel, or would you prefer a separate lightweight monitoring page (e.g., a Grafana dashboard reading from CloudWatch)?

> [!IMPORTANT]
> **Q3**: Which phases should we prioritize first? My recommendation is:
> - **Phase 1 (Security)** + **Phase 2 (CI/CD tests)** → Immediate
> - **Phase 3 (Auto-update)** → Next
> - **Phase 4 (Monitoring)** + **Phase 5 (Timeout)** → After
