



# TODO

-[] check lessons generation and progress tracking
- [] lesson generation prompt is very bad
- [] checklessons and generate new ones is not working
- [x] Clarified that lesson.focusArea in UI is already user-friendly; normalizeTopic is for internal use only.
- [] disable redirect from onboarding when user is seeing results and waiting for lesson generation 

- [x] mobile ui for onboarding screens 




## Phase 1: Backend Setup (Socket.IO Server & Google STT Streaming Integration)

*   **Complexity:** High
*   **Est. Effort:** 2-4 days

-   [ ] **Install Dependencies:**
    -   Install `socket.io`, `@google-cloud/speech`.
    -   Install dev dependency `@types/socket.io`.
-   [ ] **Set up Socket.IO Server:**
    -   Choose setup approach:
        -   Option A: Next.js API Route / Custom Server (requires careful WebSocket handling in serverless).
        -   Option B: Standalone Node.js Server (more robust for persistent connections).
    -   Initialize Socket.IO server instance.
    -   Configure CORS (especially if using a standalone server).
-   [ ] **Implement Server-Side Socket.IO `connection` Handler:**
    -   Handle new client connections.
    -   **Add Authentication/Authorization:** Verify user's Supabase JWT received during handshake. Reject unauthorized connections.
    -   Store a mapping between `socket.id` and the authenticated `userId`.
    -   Initialize a data structure (e.g., `Map`) to hold active Google STT streams, keyed by `socket.id`.
-   [ ] **Implement Server-Side Socket.IO `disconnect` Handler:**
    -   Handle client disconnections.
    -   Gracefully end the associated Google STT stream (if any) using `googleStream.destroy()` or `googleStream.end()`.
    -   Clean up `socket.id` -> `userId` mapping.
    -   Clean up Google STT stream mapping.
-   [ ] **Implement Server-Side Socket.IO `startStream` Handler:**
    -   Receive configuration from client (e.g., `languageCode`, `sampleRateHertz`).
    -   Instantiate Google Cloud Speech `SpeechClient`.
    -   Create a `streamingRecognize` request stream (`googleStream`).
    -   Configure `StreamingRecognitionConfig` (set `encoding`, `sampleRateHertz`, `languageCode`, `interimResults: true`, `enableAutomaticPunctuation: true`).
    -   Write the initial configuration request to the `googleStream`.
    -   Store the `googleStream` instance, mapped to the `socket.id`.
    -   **Set up Google Stream Event Listeners:**
        -   `'data'`: Extract transcript (check `result.isFinal`), emit `transcript` event (with transcript string and `isFinal` boolean) back to the specific client (`io.to(socket.id).emit(...)`).
        -   `'error'`: Log error, emit `sttError` event back to the client, close/destroy the `googleStream`.
        -   `'end'` / `'close'`: Clean up resources associated with this stream.
-   [ ] **Implement Server-Side Socket.IO `audioChunk` Handler:**
    -   Receive the audio chunk (`Buffer` or `ArrayBuffer`) from the client.
    -   Look up the active `googleStream` associated with the client's `socket.id`.
    -   If stream exists and is writable, write the audio chunk: `googleStream.write({ audioContent: chunk })`.
    -   Handle cases where the stream might have closed or doesn't exist.
-   [ ] **Implement Server-Side Socket.IO `stopStream` Handler:**
    -   Look up the active `googleStream` for the client's `socket.id`.
    -   Gracefully end the Google stream (`googleStream.end()` or `googleStream.destroy()`).
    -   Clean up the stream mapping for this socket.
-   [ ] **Implement Robust Server-Side Error Handling:**
    -   Add try/catch blocks around Socket.IO event handlers and Google API interactions.
    -   Handle potential errors during stream creation, writing, and ending.

---

## Phase 2: Frontend Integration (`LessonChat.tsx`)

*   **Complexity:** Medium-High
*   **Est. Effort:** 1.5-3 days

-   [ ] **Install Client Dependency:**
    -   Install `socket.io-client`.
-   [ ] **Establish Socket.IO Client Connection:**
    -   Use `useEffect` in `LessonChat.tsx` to manage the connection lifecycle.
    -   Initialize the client (`io('/path/to/socket/server')`).
    -   **Send Auth Token:** Include the Supabase JWT in `socket.auth` during connection for server verification.
    -   Store the `socket` instance in component state or ref.
    -   Set up event listeners for `connect`, `disconnect`, and `connect_error`.
    -   **Add Cleanup:** Ensure `socket.disconnect()` is called when the component unmounts.
-   [ ] **Set up Client-Side Socket.IO Event Listeners:**
    -   Listen for `transcript` event from the server.
        -   Update an `interimTranscript` state variable for real-time display.
        -   When `isFinal` is true:
            -   Update the main `userResponse` state.
            -   Automatically trigger `handleSubmitStep(step, finalTranscript)`.
    -   Listen for `sttError` event from the server.
        -   Display an error message to the user (update `feedback` state or use `toast`).
-   [ ] **Modify `MediaRecorder` Logic:**
    -   In `startRecording`, call `mediaRecorder.start(timeslice)` (e.g., `mediaRecorder.start(250)`) to get periodic chunks.
    -   Modify the `mediaRecorder.ondataavailable` handler: **Instead of** pushing to `audioChunksRef`, emit the `event.data` (Blob) to the server via `socket.emit('audioChunk', event.data)`.
    -   Modify `stopRecordingCompletely`:
        -   Call `mediaRecorder.stop()`.
        -   Emit `stopStream` event to the server.
        -   **Remove** the old logic that created a final Blob, FormData, and called the batch `transcribeAudio` action.
-   [ ] **Update UI State and Controls (`ChatInput` / Button):**
    -   The main microphone button should now toggle `startRecording` and `stopRecordingCompletely`.
    -   Display a clear "Recording" / "Stop Recording" state on the button.
    -   Display the `interimTranscript` in the UI (e.g., grayed out text below or within the main response area).
    -   The main `userResponse` area should display the latest *final* transcript received.
    -   Remove any explicit "Submit" button associated with the old batch flow.
    -   Remove the old `isProcessingSTT` state and related UI logic.
-   [ ] **Refine `handleSubmitStep`:**
    -   Ensure it's primarily triggered by receiving a *final* transcript via the `transcript` socket event listener.
    -   Keep the existing logic for handling different step types based on the final transcript.

---

## Phase 3: Configuration, Refinement & Cleanup

*   **Complexity:** Low
*   **Est. Effort:** 0.5 days

-   [ ] **Configure Environment Variables:**
    -   Define `SOCKET_SERVER_URL` (if standalone).
    -   Ensure Google Cloud credentials (`GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_CREDENTIALS_BASE64`) are correctly set up for the backend environment.
-   [ ] **Code Cleanup:**
    -   **Delete** the old batch STT Server Action file (`src/lib/server-actions/stt-actions.ts`).
    -   Remove the `fetch`/action call invoking the old batch STT from `LessonChat.tsx`.
    -   Remove `FormData` creation related to the old batch STT process in `LessonChat.tsx`.
    -   Remove any remaining state variables, refs, or functions specifically related to `window.webkitSpeechRecognition` from `LessonChat.tsx`.
-   [ ] **Refine User Experience:**
    -   Improve visual feedback during active recording.
    -   Ensure clear display of interim vs. final transcripts.
    -   Handle potential network latency or stream errors gracefully for the user.

---

## Phase 4: Testing

*   **Complexity:** High
*   **Est. Effort:** 2-3 days

-   [ ] **Write Backend Tests (Socket.IO Server):**
    -   Unit/Integration tests for Socket.IO event handlers (`connection`, `disconnect`, `startStream`, `audioChunk`, `stopStream`).
    -   Mock the `@google-cloud/speech` streaming client behavior.
    -   Test connection authentication/authorization logic.
    -   Test correct initialization and termination of Google streams.
    -   Test data forwarding from `audioChunk` to the Google stream mock.
    -   Test correct emission of `transcript` and `sttError` events to the client mock.
    -   Test resource cleanup on `disconnect` and `stopStream`.
-   [ ] **Write Frontend Tests (`LessonChat.tsx`):**
    -   Mock `socket.io-client`.
    -   Test establishing connection and sending the auth token.
    -   Test emitting `startStream`, `audioChunk`, `stopStream` events based on user interaction (button clicks).
    -   Simulate receiving `transcript` (interim and final) events from the server mock and verify UI state (`interimTranscript`, `userResponse`) updates.
    -   Verify `handleSubmitStep` is called correctly when a final transcript is received.
    -   Simulate receiving `sttError` events and verify error feedback (state/toast).
    -   Test the microphone button's different states (Idle, Recording).
-   [ ] **Perform End-to-End Testing:**
    -   Manually test the complete flow in various browsers.
    -   Test with actual speech, including pauses and potential background noise.
    -   (Optional) Explore automated E2E tests if feasible.

---

## Phase 5: Potential Future Enhancements

-   [ ] Explore optimizations for Google Streaming Recognition (e.g., speaker diarization if needed).
-   [ ] Enhance server-side error handling for more specific Google API errors.
-   [ ] Investigate alternative audio encodings (e.g., `LINEAR16`) if `WEBM_OPUS` proves problematic, adjusting `sampleRateHertz` accordingly.
-   [ ] Consider adding user-selectable STT models or features via configuration.

---
