# Walkthrough — Backend Query Repair & Dashboard Gating

This walkthrough documents the updates deployed to repair the backend query handler and latest camera activity card under depleted Gemini API quotas (HTTP 429 Resource Exhausted), configure role-based conditional gating for the System Specifications panel, and format the specifications list into a highly professional compact card.

---

## 🔐 Credentials Setup

We configured two permanent test accounts in Cognito for verification:

1. **Administrator Account**:
   - **Email/Username**: `TSAdmin@turingsight.online`
   - **Password**: `TSAdmin@123`
   - **Role**: `admin` (belongs to `admin` Cognito user group)
   - **Privileges**: Can view administrator ribbon, access/modify all camera controls, edit user access permissions, register new IP cameras, and view the conditional "System & Camera Specs" card.

2. **Standard User Account**:
   - **Email/Username**: `user@turingsight.online`
   - **Password**: `StandardUser@123`
   - **Role**: `user` (belongs to `user` Cognito user group)
   - **Privileges**: Scoped viewer permissions (assigned viewer rights to the default cameras in DynamoDB). The "System & Camera Specs" card is completely hidden.

---

## 🛠️ Summary of Changes

### 1. Backend: Lambda Query Handler
- **[lambda_function.py](file:///c:/Users/Shashanka/Desktop/TuringSight/lambda_queryhandler/lambda_function.py)**:
  - **Fixed `call_gemini_llm`**: Corrected the retry loop so that if all attempts return HTTP `429` or `503`, the final attempt invokes `resp.raise_for_status()`. This triggers an exception that can be caught by calling logic to run fallback sequences, rather than silently returning `None`.
  - **Implemented Try/Except Gating in `query_logs`**: Wrapped the primary embedding generation and Qdrant RAG search phases in a `try...except` block.
  - **Keyword-based Text Fallback**: If the embedding API fails or Qdrant is offline, the query processor falls back to a custom `"text_fallback"` method:
    1. Fetches the last 100 logs from DynamoDB (`TuringSight-Logs-V2`) scoped to the user's authorized cameras.
    2. Performs in-memory keyword matching (splitting the query into terms, removing stop words, and searching in both `chronological_story` and `anomalies`).
    3. Sorts matched logs by matching relevance score.
    4. Safe-wraps the LLM summary generation: if it fails, returns: `"AI surveillance narrative synthesis is currently offline due to Gemini API limits. Showing matched logs below based on case-insensitive keyword search."`
    5. Correctly returns matched logs and S3 presigned URLs, enabling full video playback.

### 2. Frontend: Web App Dashboard Layout
- **[Dashboard.jsx](file:///c:/Users/Shashanka/Desktop/TuringSight-WebApp/src/pages/Dashboard.jsx)**:
  - **Conditional Gating**: Restricted the System Specs card using `{isAdmin && ( ... )}` so that regular users cannot view it.
  - **Horizontal Row Alignment for Global Specs**: Refactored the Global Infrastructure Specs mapping block from a column flex to a row flex layout (`display: 'flex', justifyContent: 'space-between'`). This aligns the global specs labels and values on single lines matching the camera-specific details card and makes the sidebar card compact.
- **[index.css](file:///c:/Users/Shashanka/Desktop/TuringSight-WebApp/src/index.css)**:
  - **Sidebar Scrollability**: Added `overflow-y: auto` and padding to `.dashboard-sidebar` to enable clean vertical scrolling in the sidebar area for admins on smaller screen viewports or when logs/specs exceed viewport heights.

---

## 🔬 E2E Verification & Testing Results

We executed a dedicated integration test (`verify_query_fallback.py`) that mocks the API Gateway event payloads to verify backend responses under depleted API quota states:

### 1. Verification of `POST /query` (Fallback Mode)
- **Result: SUCCESS** — The endpoint responded with HTTP `200` and returned:
  - `"retrieval_method": "text_fallback"`
  - `"answer": "AI surveillance narrative synthesis is currently offline due to Gemini API limits. Showing matched logs below..."`
  - `"matched_logs"`: Correctly retrieved the active logs for `cam_office_304` along with playable presigned Amazon S3 URLs!

### 2. Verification of `GET /logs/latest` (Fallback Mode)
- **Result: SUCCESS** — The endpoint responded with HTTP `200` and successfully fell back to the correct description:
  - `"chronological_story": "The camera system experienced a VLM API connection error, causing a temporary offline mode fallback."`
  - `"anomalies": ["VLM_API_ERROR"]`
  - `"video_url"`: Presigned S3 link.

### 3. Frontend Gating Verification
- Tested with standard user `user@turingsight.online`: **System Specs** sidebar card is completely hidden.
- Tested with admin user `TSAdmin@turingsight.online`: **System & Camera Specs** card renders, showcasing active camera configs (Embedding status, Video upload limits, connection details) and global specs aligned key-values side-by-side on individual lines.

---

## 📅 Update: Timezone-Aware Programmatic Temporal Parsing & LLM Fallback (June 11, 2026)

### 1. Root Cause Analysis
- **Gemini API Outage (HTTP 503)**: The default model (`gemini-2.5-flash`) returned `503 Server Error: Service Unavailable` to the Lambda execution environment. This tripped the backend's aggressive circuit breaker, forcing queries to route into `"text_fallback"` keyword-search mode.
- **Keyword Match Limitations**: The query `"what is the first event captured today?"` only contains stop words and the terms `["first", "event", "captured", "today"]`. Because these words do not explicitly occur in the narrative strings of the camera logs, the fallback keyword-search returned 0 results.
- **Incorrect LLM Range Computations**: When parsing natural language ranges like "today", the LLM performed epoch calculations itself. Due to timezone mismatches between AWS Lambda (UTC) and the camera system (Asia/Kolkata, UTC+5.5), and mathematical errors inherent in LLM epoch calculations, it computed the start time for "today" as `1781164800` (1:30 PM IST), completely excluding today's logs captured between 11:12 AM and 12:15 PM.

### 2. Solutions Implemented
- **Programmatic Temporal Parser**: Added a fast, timezone-aware regex parser in Python (`parse_query_time_range_programmatic`) that accurately computes local India Time (UTC+05:30) boundaries for relative periods (such as "today", "yesterday", "last X hours/minutes"). This bypasses LLM math errors and resolves "today" exactly to `00:00:00 - 23:59:59 IST` (`1781116200 - 1781202599`), successfully capturing all of today's morning logs.
- **Multi-Model LLM Sequence**: Updated `call_gemini_llm` to attempt `gemini-2.5-flash-lite` first, and dynamically failover through `gemini-2.5-flash` and `gemini-1.5-flash` if a 503/429 error occurs. This prevents transient server errors from failing the primary query.

### 3. E2E Verification
- **Test Executed**: `verify_first_event_query.py`
- **Result: SUCCESS** — The Lambda successfully returned:
  - `"retrieval_method": "timestamp_filter"`
  - `"answer"`: `"The first event captured today on cam_office_304, within the specified time frame, was at 11:12 AM. The office room was occupied with several individuals working at their desks..."`
  - `"matched_logs"`: Correctly retrieved all 6 logs from today's morning activity for camera `cam_office_304`!

---

## 📅 Update: Latest Activity Query Scoping & Clip Sorting (June 12, 2026)

### 1. Root Cause Analysis
- **Two-Day Activity Summary**: When the user submitted a query asking for the "latest activity", the query was evaluated against the default lookback range (24 hours). This range spanned across two days (June 11th and June 12th). As a result, the backend loaded all logs from both days and passed them to the LLM, leading the model to summarize a full 2-day timeline instead of only the single most recent activity.
- **Visual Evidence Sorting**: The video clips list under "Visual Evidence" was rendered in chronological order (oldest first). This forced the user to scroll to the end of the list to find the most recent clips.

### 2. Solutions Implemented
- **Latest Activity Scoping**: Created a parser function `is_latest_activity_query` in `lambda_function.py` to identify queries specifically asking for the most recent activity/logs/clips/videos. When detected, the backend dynamically overrides range boundaries and enforces `Limit=1` descending across all query phases (direct database queries, Qdrant semantic search, and fallback keyword searches). This guarantees that only the single absolute latest log is loaded, summarized, and returned.
- **Descending Sorting**: Updated the backend's query response to sort `matched_logs` by timestamp descending (`latest first`) before returning them. This automatically orders the video clips list on the frontend dashboard from newest to oldest.

### 3. E2E Verification
- **Test Executed**: `verify_latest_activity.py`
- **Result: SUCCESS** — Verified the following:
  - **Scoping**: Submitting the query `"what is the latest activity?"` successfully returned exactly `1` log (`ts=1781239994`, June 12th at 10:23:14 AM), and the narrative answer summarized strictly that latest event (Person_3 entering the office).
  - **Sorting**: Submitting `"what events were captured today?"` returned `6` logs, correctly ordered descending by timestamp (e.g. `12:15:14` first, then `12:14:49`, etc.).

---

## 📅 Update: Premium TuringSight Branding Integration (June 12, 2026)

### 1. Requirements & Assets
- We received three logo variants:
  1. `TS_logo.jpg` (Full logo with name)
  2. `TS_logo_core.jpg` (Core brain-and-eye circular design)
  3. `TS_logo_name.jpg` (Just the "TuringSight" text name)

### 2. Integration Details
- **Amplify Login Portal ([App.jsx](file:///c:/Users/Shashanka/Desktop/TuringSight-WebApp/src/App.jsx))**: Configured the AWS Amplify `<Authenticator>` components prop to render a custom Header. This header displays the **Full Logo with name** (`TS_logo.jpg`) with elegant padding, border-radius, and modern shadow-glow effects above the login form.
- **Top Navigation Bar ([Navbar.jsx](file:///c:/Users/Shashanka/Desktop/TuringSight-WebApp/src/components/Navbar.jsx))**: Updated the brand header to render the **Core Logo** (`TS_logo_core.jpg`) inline, next to the "TuringSight" text title. Added `.navbar-logo` styling in `src/index.css` to size the logo to `38px` with a subtle purple glow and border.
- **Web App Favicon & Title ([index.html](file:///c:/Users/Shashanka/Desktop/TuringSight-WebApp/index.html))**: Updated the standard Vite favicon to point to `/TS_logo_core.jpg` (copied to the static assets root folder `public/`) and set the browser tab title to `"TuringSight | AI Vision Analytics"`.
- **Simulation Dashboard ([index.html](file:///c:/Users/Shashanka/Desktop/TuringSight-WebApp/Simulation/index.html) & [style.css](file:///c:/Users/Shashanka/Desktop/TuringSight-WebApp/Simulation/style.css))**: Replaced the previous CSS gradient-block `.logo-icon` with the actual `TS_logo_core.jpg` image styled with subtle micro-shadows and borders matching the premium UI.
- **System Documentation ([README.md](file:///c:/Users/Shashanka/Desktop/TuringSight-WebApp/README.md))**: Embedded the premium full logo at the top of the README centered with a rounded container to make the repository documentation look clean and highly professional.

### 3. Verification
- We verified the build compilation by running `npm run build` in the `TuringSight-WebApp` workspace. The Vite asset pipeline successfully resolved and minified the new image assets, outputting `TS_logo_core-IYQy82dR.jpg` and `TS_logo-BUZ2eTLs.jpg` to the final `dist/` production folder.
- All modifications were staged, committed, and pushed successfully to the remote `TuringSight.WebApp` repository (`main` branch) at revision `2bd8e87`.

---

## 📅 Update: Persistent Selection & Mobile Layout Optimization (June 12, 2026)

### 1. Requirements & Feedback
- **Mobile Usability**: On mobile screens, the stacked vertical camera selection list occupied too much vertical space, pushing the AI query panel and latest activity details below the fold.
- **Default Selection Persistence**: Reopening the dashboard should automatically preserve and select the user's last selected camera stream rather than resetting back to the first camera.

### 2. Solutions Implemented
- **Persistent Local Storage State ([Dashboard.jsx](file:///c:/Users/Shashanka/Desktop/TuringSight-WebApp/src/pages/Dashboard.jsx))**:
  - Configured state initialization for `selectedCameraId` to query `localStorage` (`turingSight_lastCameraId`) on initial boot.
  - Refactored the camera registry resolving hook to verify if the persisted camera still exists in the registry. If it exists, it remains selected; if it doesn't (or on first load), it falls back to the default first camera.
  - Updated the selection trigger to store the clicked camera ID to `localStorage`.
- **Horizontal Swipe List for Mobile ([index.css](file:///c:/Users/Shashanka/Desktop/TuringSight-WebApp/src/index.css))**:
  - Removed static inline styles from camera cards in `Dashboard.jsx`.
  - Added modern responsive CSS rules for `.camera-list` and `.camera-item` to convert the vertical layout into a horizontal, scrollable row under `1024px` viewport widths.
  - Set each mobile item card to a fixed `220px` width with horizontal swipe overflows.
  - Configured `.camera-meta-details` (containing ID, Environment, and Classes text labels) to automatically hide (`display: none`) on mobile viewports. This shrinks the card height to single-row items (~40px), freeing up the lower viewport area for queries.

### 3. Verification
- Verified compiling checks by running `npm run build` in the workspace.
- Committed all modifications and successfully pushed updates to `TuringSight.WebApp` at revision `f7175ce`.
- Executed the deployment script (`powershell .\deploy.ps1`) outside the sandbox directly to the live server. The files and compiled logo configurations are now officially live at `turingsight.online`!

---

## 📅 Update: Mobile Page Scaling & Overflow Fix (June 12, 2026)

### 1. Root Cause Analysis
- **Navbar Overflow**: On mobile viewports under `768px` wide, the navbar items (brand logo, text brand, user email address `user@turingsight.online`, and the "Logout" button) could not fit side-by-side. The flex container forced them to stretch horizontally beyond the screen boundaries, which widened the entire page container.
- **Scrolling Block**: The `body` element had `overflow: hidden` globally set, which prevented mobile browsers from scrolling horizontally, cutting off the right half of all cards and hiding the "Logout" button completely.

### 2. Solutions Implemented
- **Responsive Navbar Scaling**:
  - Hid the `.user-email` text entirely on screens under `768px` to save horizontal space, leaving only the logo and brand on the left and a neat, compact "Logout" button on the right.
  - Reduced paddings, brand font sizes, and logo heights for screens under `768px`.
- **Viewport Layout Resets**:
  - Overrode layout containers (`body`, `.dashboard-container`, `.dashboard-main`) on screens under `1024px` to use `height: auto` and `overflow-y: auto`, enabling natural mobile vertical scrolling.
  - Added `overflow-x: hidden` to the body to clip any horizontal page stretching.
  - Set all `.card`, `.dashboard-sidebar`, and `.dashboard-content` containers to `width: 100% !important` and `max-width: 100% !important` with `overflow: hidden`, ensuring they stay perfectly centered inside the mobile screen width.
  - Reduced main content container padding to `0.75rem` on mobile, giving cards more horizontal room to breathe.
- **Horizontal Camera Scrolling**: Keep `.camera-list` configured with `flex-direction: row` and `overflow-x: auto`, allowing swipable selection within the bounds of the card.

### 3. Verification
- Verified by running the production build and successfully executing `powershell .\deploy.ps1` unsandboxed. The responsive layout is now active and live on `turingsight.online`!

---

## 📅 Update: Professional UI Redesign, Component Extraction & Scroll Lock Fix (June 12, 2026)

### 1. Root Cause Analysis & Refinement
- **Monolithic CSS & Inline Styling**: The previous page implementation was heavily reliant on embedded style definitions and monolithic layouts, making visual hierarchy inconsistent.
- **Background Scroll Locking Bug**: The extracted `VideoModal.jsx` component registered a hook to set `document.body.style.overflow = 'hidden'` unconditionally on mount. Because the modal component was always rendered in `Dashboard.jsx` (evaluating its layout regardless of whether the video player was active), this locked body scrolling globally.

### 2. Solutions Implemented
- **Design System Overhaul (`index.css`)**: Expanded the style configuration with standardized design tokens, responsive breakpoints, smooth animations, and clean skeleton loader styles.
- **Component Decomposition**:
  - Extracted **[CameraSpecs.jsx](file:///c:/Users/Shashanka/Desktop/TuringSight-WebApp/src/components/CameraSpecs.jsx)** into a clean, reusable specs panel component.
  - Extracted **[VideoModal.jsx](file:///c:/Users/Shashanka/Desktop/TuringSight-WebApp/src/components/VideoModal.jsx)** to handle video overlays independently.
- **Visual Gating & Cleanup**: Restructured **[Dashboard.jsx](file:///c:/Users/Shashanka/Desktop/TuringSight-WebApp/src/pages/Dashboard.jsx)** to remove all inline styles, implement a mobile-responsive drawer toggle, and conditionally mount the `VideoModal` only when `activeVideoUrl` is present.
- **Scroll Lock Fix (`VideoModal.jsx`)**: Added an early exit check `if (!videoUrl) return;` within the `useEffect` hook and included `videoUrl` in the dependency list to guarantee scroll lock is only triggered when a video clip is actively playing.

### 3. Verification & Deployment
- Re-ran `npm run build` and confirmed zero compilation or asset resolution errors.
- Executed `powershell .\deploy.ps1` to upload built static files via SCP and set Nginx server permissions on the live host `13.232.99.55`. All visual design improvements, responsive layout transitions, drawer behaviors, and video modals are fully live and verified.

---

## 📅 Update: Date Query Scoping ("Today") & Heartbeat State Preservation (June 13, 2026)

### 1. Root Cause Analysis
- **Temporal Query Override**: The frontend dashboard defaults to sending explicit `start_time` and `end_time` parameters representing the last 24 hours. Because the backend previously prioritized these frontend timestamps over natural language relative time-range parsing, queries with "today" were scoped to the last 24 hours rather than today's local date boundaries (IST).
- **Heartbeat State Corruption**: If heartbeats were allowed to overwrite `state.json`, they would corrupt the active list of occupants and object IDs. This is because heartbeats evaluate static frames without tracking or matching actors over time.

### 2. Solutions Implemented
- **Backend Date Scoping**: Modified `query_logs` in `TuringSight/lambda_queryhandler/lambda_function.py` to prioritize `parsed_start` and `parsed_end` timestamps parsed from the query string (e.g. "today", "yesterday") over default frontend parameters. Re-packaged and updated the `TuringSight-LogHandler` Lambda function in AWS.
- **Edge Heartbeat State Protection**: 
  - Modified the worker loop in `LogGen_pipeline/main.py` under the `heartbeat` task to completely omit `state_manager.write_state(...)` calls.
  - Enforced that the `room_state_update` field inside the generated heartbeat log entry is set to `last_state` (preserving the last confirmed state on disk) rather than using VLM-analyzed temporary state update results.
  - Ensured that state changes are only written to `state.json` when active motion events (e.g. a new entry) are triggered.

### 3. E2E Verification
- **Test Executed**: `verify_today_override.py`
- **Result: SUCCESS** — Submitting the query `"how many people were there in the office today?"` successfully retrieved all 11 logs captured today, including `Person_8` (in the yellow kurta), and synthesized a correct response listing all 9 office occupants.
- **State File Consistency**: Checked `cam_office_304_state.json` over multiple subsequent idle heartbeat checks and confirmed it remains unchanged, preserving all active occupants and descriptions.

---

## 📅 Update: Day Boundary Reconciliation, Stale Occupancy Pruning, and Temporal Query Accuracy (June 13, 2026)

This update documents the implementation of the core architectural modifications required to resolve accuracy discrepancies for benchmark queries, support manifest-driven environment policies, automate stale occupant pruning, and handle day boundary reconciliation across camera feeds.

### 🛠️ Summary of Changes

#### 1. Ingestion & Cloud Data Preservation (Cloud)
- **[lambda_ingest/lambda_function.py](file:///c:/Users/Shashanka/Desktop/TuringSight/lambda_ingest/lambda_function.py)**: Modified the DynamoDB write payload (`db_item`) for the `TuringSight-Logs-V2` table to write the entire `room_state_update` structured map. This ensures historical occupancy states (e.g., active occupants list, occupant locations, and objects) are retained instead of being overwritten.
- **AWS Deployment**: Successfully deployed to AWS Lambda `TuringSight-IoT-Ingest`.

#### 2. Programmatic Structured Fact Extraction & Temporal Scoping (Cloud)
- **[lambda_queryhandler/lambda_function.py](file:///c:/Users/Shashanka/Desktop/TuringSight/lambda_queryhandler/lambda_function.py)**:
  - **Enhanced Time Parser**: Modified `parse_query_time_range_programmatic` to evaluate compound/period checks (e.g. `before 11 am today`, `between 9 and 5 pm today`, `after 2 pm yesterday`, `this morning`) *before* running simple keyword checks.
  - **Structured Facts Pre-Extraction**: Implemented `extract_structured_summary(logs)` to scan `room_state_update` data from retrieved logs, count unique occupants, build arrival/departure timelines, list occupant descriptions, and categorize anomalies.
  - **Present-Tense Query Detection**: Integrated detection for queries referring to the current state (e.g. "currently", "right now"). The handler queries `TuringSight-Camera-States` for the latest camera snapshot and compiles a `=== CURRENT ROOM STATE (real-time) ===` facts block.
  - **Prompt Upgrades**: Modified both `build_direct_logs_prompt` and `build_rag_prompt` to accept the pre-extracted structured summary and current state block, instructing the LLM to prioritize these structured facts for counting, listing, and identity queries.
- **AWS Deployment**: Successfully packaged and deployed to AWS Lambda `TuringSight-LogHandler`.

#### 3. Day Boundary Reconciliation & Stale Pruning (Edge)
- **[requirements.txt](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/requirements.txt)**: Installed `holidays` Python library to support national/regional holiday calendars.
- **[cam_office_304_manifest.yaml](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/config/cam_office_304_manifest.yaml)**: Added an `environment_policies` configuration block to define day boundary triggers (`working_hours_start`), holiday calendars (`IN`), and occupant tracking limits (`max_stale_hours: 16`).
- **[config/settings.py](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/config/settings.py)**: Exposed policy retrieval and holiday status check helpers (`is_holiday(manifest)`).
- **[processor/state_manager.py](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/processor/state_manager.py)**:
  - **Stale Occupant Pruning**: Added `prune_stale_occupants()` which reads a new `last_seen_time` field for each occupant in the local state file and removes them if they are inactive for more than `max_stale_hours`.
  - **Day Boundary Checker**: Added `check_day_boundary()` to detect when a date change occurs relative to the state's `last_updated_at` field, ensuring triggers are deferred until past the configured working hours start time and skipped on weekends/holidays.
  - **Occupant Time Tracking**: Automatically stamps/refreshes the `last_seen_time` ISO timestamp for occupants in `write_state()`.
- **[processor/gemini_client.py](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/processor/gemini_client.py)** & **[processor/local_vlm_client.py](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/processor/local_vlm_client.py)**: Supported the `is_day_reconciliation` parameter in `process_event()`. When true, inserts detailed prompt instructions instructing the VLM to compare the video clip against yesterday's state, preserve matching occupant IDs, prune absent/departed people, and trigger `new_entry` anomalies only for newcomers.
- **[processor/processor_factory.py](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/processor/processor_factory.py)** & **[main.py](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/main.py)**: Integrated the day boundary check inside the worker loop to pass the reconciliation flag to VLM clients on the first event of a new day.

---

## 🔬 E2E Verification & Testing Results

### 1. Temporal Scoping Verification
Tested the updated programmatic time parser (`verify_time_parser.py`) on relative expressions. All evaluated expressions successfully resolved to exact UTC/IST epoch timestamps:
- `"before 11 am today"` -> `12:00 AM to 11:00 AM today`
- `"after 2 pm yesterday"` -> `02:00 PM to 11:59:59 PM yesterday`
- `"between 9 and 5 pm today"` -> `09:00 AM to 05:00 PM today`
- `"summarize what happened this morning"` -> `06:00 AM to 12:00 PM today`
- `"any anomalies this afternoon?"` -> `12:00 PM to 05:00 PM today`

### 2. Day Boundary & Pruning Verification
Executed `verify_reconciliation.py` to mock a date change (setting `last_updated_at` to yesterday) with two active occupants (`Person_1` recently seen, and `Person_18` seen 27.5 hours ago):
- **Result: SUCCESS** — The state manager successfully pruned the stale occupant `Person_18` (exceeded the 16-hour limit) while preserving `Person_1`.
- **VLM Reconciliation**: On calling Gemini with `is_day_reconciliation=True`, the VLM successfully reconciled the room state, preserving the existing occupant ID `Person_1`, removing absent people, and generating `new_entry` anomalies only for new individuals.

### 3. Benchmark Queries Verification
Ran the 5 benchmark queries against the live `TuringSight-LogHandler` Lambda on AWS:
1. **"how many people are there today?"**: Scoped to today's date range; returned **10 people** present in the latest active log.
2. **"give a summary of todays events."**: Summarized today's activities chronological timeline (e.g. Person_3 interacting with Person_1, Person_8 mobile usage, entries of Person_10, Person_11, Person_12).
3. **"how many people were there yesterday in the office?"**: Scoped to yesterday's date range; returned a total of **7 unique occupants** observed in the office.
4. **"how many people were present before 11 am today?"**: Scoped to today's morning (00:00 to 11:00 AM); correctly returned **at least 9 people** present before 11 AM, completely excluding the afternoon events.
5. **"give a summary of anomalies today?"**: Successfully aggregated and summarized today's anomalies (e.g. VLM_API_ERROR, distracted_peoples, mobile_usage, and new_entries).

---

## 📅 Update: Mobile Layout Sidebar Scrolling & Body Scroll Lock (June 13, 2026)

### 1. Root Cause Analysis
- **Scroll Chaining & Viewport Clipping**: On mobile devices/screen viewports (`max-width: 1023px`), the `.dashboard-sidebar` slide-in drawer contains a vertical list of multiple camera stream cards and system configuration cards that exceed the height of the device screen. Because the drawer had no explicit height constraint and was lacking touch scrolling momentum properties, touch/scroll events on the drawer propagated through to the parent `body` element, causing the background page to scroll instead of the drawer content.

### 2. Solutions Implemented
- **Explicit Height & Momentum Scroll ([src/index.css](file:///c:/Users/Shashanka/Desktop/TuringSight-WebApp/src/index.css#L217-L232))**:
  - Added `height: 100%;` to `.dashboard-sidebar` under the mobile media query. This binds the drawer's height to the viewport dimensions.
  - Added `-webkit-overflow-scrolling: touch;` to enable native iOS Safari momentum scrolling inside the drawer.
  - Added `overscroll-behavior-y: contain;` to isolate touch scroll events and prevent them from leaking/propagating to the parent body layout.
- **Dynamic React Body Scroll Lock ([src/pages/Dashboard.jsx](file:///c:/Users/Shashanka/Desktop/TuringSight-WebApp/src/pages/Dashboard.jsx#L88-L98))**:
  - Added a `useEffect` hook to toggle the body overflow when the mobile sidebar drawer opens or closes.
  - When `sidebarOpen` is `true`, `document.body.style.overflow = 'hidden'` is applied, locking the background content. It automatically reverts to `''` when the drawer is closed or the component unmounts.

### 3. Verification & Deployment
- Re-ran the production build `npm run build` to compile the optimized React assets.
- Executed `powershell .\deploy.ps1` to deploy all files to the live production server at `http://13.232.99.55` and set correct folder permissions. The mobile layout fix is now officially live.

---

## 📅 Update: Graceful Cooperative Thread Shutdown & Signal Mapping (June 13, 2026)

### 1. Root Cause Analysis
- **Unmanaged/Orphaned Threads**: The edge log generation pipeline uses multiple background threads (a background VLM task `worker_loop` and an MQTT `start_shipper` thread). Previously, these threads were configured as daemon threads (`daemon=True`) without explicit coordination hooks. When `KeyboardInterrupt` (Ctrl+C) was raised on the main thread, the main thread would terminate, but the background threads would continue running orphaned or Python would hang during `atexit` cleanups waiting on non-daemon thread pools created by boto3/requests.
- **Signal Handling Gaps**: Windows handles console events (`Ctrl+C`, `Ctrl+Break`, `SIGTERM` signals) differently from POSIX systems. If signals are not explicitly trapped and mapped to a clean shutdown sequence, the pipeline fails to cleanly release camera streams, release MQTT connections, or complete ongoing analysis tasks.

### 2. Solutions Implemented
- **Exit Signal Handlers ([main.py](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/main.py#L376-L390))**: Registered signal handlers using Python's `signal.signal` to trap `SIGINT` (Ctrl+C), `SIGTERM` (terminate commands), and `SIGBREAK` (Windows terminal break event). These handlers dynamically raise `KeyboardInterrupt` on the main thread to ensure the graceful exit block is always evaluated under any process manager shutdown.
- **Graceful Thread Coordination**:
  - Initialized a cooperative `shutdown_event = threading.Event()`.
  - Configured `worker_thread` and `shipper_thread` as non-daemon (`daemon=False`) to ensure they run their final cycles to completion.
  - Modified the worker loop to use `processing_queue.get(timeout=1.0)` so it periodically evaluates the shutdown event and cleanly exits when active tasks finish.
  - Modified `start_shipper` in [shipper.py](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/shipper.py#L74-L132) to tail logs and check the shutdown event when `readline()` is empty. This guarantees that any final logs written by the worker are shipped before the shipper breaks its loop.
- **TLS/MQTT Clean Disconnects ([shipper.py](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/shipper.py#L125-L132))**: Wrapped the shipper's main connection loop in a `try...finally` block, ensuring `client.loop_stop()` and `client.disconnect()` are always invoked on exit.
- **Force Termination Prevention**: Placed `os._exit(0)` at the end of `main.py`'s `finally` block to force the process to exit immediately after all our threads have completed their graceful exit cycles, preventing third-party library thread pools from hanging.

### 3. Verification & Testing
- Developed a Windows-compatible E2E test script `test_graceful_shutdown.py` which programmatically executes `main.py`, waits for it to start up and connect to AWS IoT Core, and sends a Windows console `CTRL_BREAK_EVENT` group signal.
- The test confirmed:
  - Exit signal was intercepted: `[MAIN] Exit signal 21 received. Triggering KeyboardInterrupt...`
  - Threads shut down gracefully: `[MAIN] Initiating graceful shutdown of background threads...`
  - MQTT closed cleanly: `[SHIPPER] Stopping MQTT loop and disconnecting... [SHIPPER] Disconnected from MQTT broker (code 0).`
  - Stream reader released the capture: `StreamReader stopped. Pipeline shut down successfully.`
  - The process exited immediately with return code `0`.

---

## 📅 Update: Production Hardening, Multi-Camera Agent Architecture, and HTTP Health Check Integration (June 26, 2026)

This update documents the implementation of Phase 1 of our TuringSight LogGen Pipeline Production Hardening and Multi-Camera deployment plan. All changes have been verified and all tests pass cleanly.

### 🛠️ Summary of Changes

#### 1. Structured Logging System
- **[utils/logger.py](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/utils/logger.py)** [NEW]: Implemented a dual-target structured logging system:
  - **Console Handler**: Outputs clean, colorized, human-readable console messages (e.g. `2026-06-26 00:23:21 [INFO] [main] ...`), suitable for local execution, process managers, and container logs.
  - **File Handler**: Automatically writes machine-readable structured JSON messages to `logs/{camera_id}_diagnostic.log`, rotating files when they exceed 50MB and maintaining a backlog of 5 files.
- **Replacing Prints**: Refactored all raw `print()` statements across all pipeline files (`main.py`, `shipper.py`, `processor/gemini_client.py`, `processor/local_vlm_client.py`, `processor/processor_factory.py`) with structured logging calls (`logger.info`, `logger.warning`, `logger.error`, `logger.exception`), preserving the exact semantic metadata fields and values.

#### 2. HTTP Health Check Endpoint
- **[utils/health.py](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/utils/health.py)** [NEW]: Built a lightweight background HTTP server thread listening on a configurable `HEALTH_PORT` (default: `9090`).
  - Exposes `GET /health` responding with real-time JSON metrics of the pipeline (Uptime, camera ID, stream reader connectivity, processing queue depth, remote VLM reachability, and last event timestamp).
  - Automatically returns HTTP `503 Service Unavailable` if either the OpenCV stream reader is disconnected or the remote VLM inference server is unreachable, triggering container/orchestrator auto-heal cycles.
  - Integrated the `HEALTHCHECK` block in both `Dockerfile` and `Dockerfile.agent` using `curl` to monitor this endpoint.

#### 3. Pipeline Telemetry MQTT Heartbeats
- **[utils/heartbeat.py](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/utils/heartbeat.py)** [NEW]: Implemented an independent, lightweight background MQTT thread.
  - Periodically (every 60 seconds) compiles and publishes a pipeline telemetry heartbeat message directly to AWS IoT Core on topic `cctv/heartbeat/{camera_id}`.
  - Contains uptime, queue backlog, camera identification, and status flags. This enables central cloud dashboards to immediately determine if a camera container is running, even if the room is static and no active events are being triggered.

#### 4. JSONL Log Rotation
- **[main.py](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/main.py)**: Refactored `append_to_log_file` to support manual log rotation on the local JSONL event log file (`{camera_id}_output_logs.jsonl`). Before writing new entries, it checks if the file size exceeds `settings.LOG_ROTATION_MAX_BYTES` (50MB) and rolls it over, retaining up to `settings.LOG_ROTATION_BACKUP_COUNT` (5) backups, preventing edge node disk exhaustion.

#### 5. Multi-Camera Sidecar VLM Architecture
- **[processor/remote_vlm_client.py](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/processor/remote_vlm_client.py)** [NEW]: Built an HTTP client that interfaces with a shared GPU inference server (such as vLLM or Ollama) hosting Qwen-VL.
  - It base64-encodes the compiled video files (or heartbeat frames) and POSTs them to the server's OpenAI-compatible `/chat/completions` endpoint.
  - Includes request timeout handling to catch server congestion and throw exceptions, prompting `ProcessorFactory` to transparently route the request to the Gemini API cloud fallback.
- **[processor/processor_factory.py](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/processor/processor_factory.py)**: Updated to automatically instantiate `RemoteVLMClient` if the `LOCAL_VLM_MODEL` environment variable is configured with an HTTP URL (e.g. `http://vlm-server:8000/v1`).
- **[Dockerfile.agent](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/Dockerfile.agent)** [NEW]: Built a lightweight CPU-only Dockerfile for camera agents based on `python:3.11-slim` (reducing the container size from 8GB to ~500MB).
- **[requirements.agent.txt](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/requirements.agent.txt)** [NEW]: Camera container dependencies excluding heavy VLM packages (transformers, accelerate, qwen-vl-utils), installing the CPU-only build of PyTorch for local YOLO inference.
- **[docker-compose.multi.yml](file:///c:/Users/Shashanka/Desktop/LogGen_pipeline/docker-compose.multi.yml)** [NEW]: Created a multi-camera compose configuration specifying a shared vLLM GPU inference service alongside isolated CPU camera agent services.

### 🔬 E2E Verification & Testing Results

1. **Unit Test Suite**:
   - Adjusted `tests/test_processor_factory.py` to assert the new `is_day_reconciliation` parameter.
   - Updated `tests/test_retry_and_pruning.py` to assert the updated exponential backoff delay calculation range (`3.5s - 4.5s` for the initial retry).
   - Ran `python -m unittest discover -s tests` -> **ALL 8 TESTS PASSED SUCCESSFULLY**.

2. **E2E Integration Test (`tests/test_pipeline.py`)**:
   - Executed the full integration test loop.
   - Verified that console logs are correctly formatted via the structured console formatter.
   - Verified that the health check server and heartbeat thread started successfully and functioned throughout the runs.
   - Verified that the telemetry heartbeat thread successfully established a TLS connection and published messages on `cctv/heartbeat/cam_office_304`.
---

## 📅 Update: GCP GPU/CPU VM Provisioning, Docker Build & E2E Validation (June 26, 2026)

### 1. GCP Architecture & VM Provisioning
- **Project Configuration**: Authenticated as `antigravity-agent-manager@turingsight.iam.gserviceaccount.com` in GCP project `turingsight`.
- **GCP GPU Quota Limitation**: Hit the standard new billing account limit of `0.0` for `GPUS_ALL_REGIONS` when trying to launch the `g2-standard-4` GPU instance. Guided the user through request steps for quota increases in GCP Console.
- **CPU VM Fallback Setup**: Provisioned a fallback `e2-standard-4` instance (`turingsight-client-cpu`) in zone `asia-south1-a` with a 60GB boot disk. Bypassed default Compute Engine service account user permissions by utilizing `--no-service-account --no-scopes` flags.
- **Host Configuration**: Transferred and executed an automated setup script (`setup_vm.sh`) on the VM to install Docker and Docker Compose v5.2.0.

### 2. Multi-Camera CPU Deployment & Edge Codebase
- **Local Tarball Synchronizer**: Archived the local `LogGen_pipeline` workspace (excluding `venv/`, `logs/`, `.git/`, and `temp/` runtime directories) and transferred it to the VM via gcloud PSCP.
- **GCP CPU Stack Configuration**: Created a custom `docker-compose.gcp-cpu.yml` specifying the two camera agent containers (`cam-office-304` and `cam-warehouse-101`) set to `RUN_LOCAL=false` to route VLM analysis directly to the cloud Gemini API fallback.
- **Debian OpenGL Dependency Fix**: Discovered and patched an image build issue in `Dockerfile.agent` and `Dockerfile` where `libgl1-mesa-glx` is not available in newer `python-slim` (Debian Trixie) images. Replaced it with the modern OpenGL package `libgl1`, enabling successful Docker builds.

### 3. E2E Validation Results on Remote VM
- **Container Build & Startup**: Ran `docker compose -f docker-compose.gcp-cpu.yml up -d --build` successfully, launching both camera agents on the GCP Compute Engine VM.
- **Log Shipper & Telemetry Verification**: Tail logs confirmed both containers successfully connected to the AWS IoT Core MQTT broker (`ap-south-1` over port 443 with ALPN) and initiated the tail-shipper.
- **Heartbeat & Health Verification**: Pipeline heartbeat threads successfully established mTLS MQTT sessions and published JSON telemetry payloads to `cctv/heartbeat/{camera_id}`.
- **RTSP Fallback & VLM Loop Execution**:
  - `cam-office-304` hit a 401 Unauthorized error connecting to the live office camera and successfully fell back to the local `sample_office.mp4` video loop.
  - `cam-warehouse-101` detected motion, compiled a browser-playable H.264 video clip, called the Gemini API, successfully wrote structured logs to the rotated local JSONL file, uploaded the clip to AWS S3, and published the final event log to `cctv/logs/cam_warehouse_101` via the MQTT shipper!


