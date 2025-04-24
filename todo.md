



# TODO

-[] check lessons generation and progress tracking
- [] lesson generation prompt is very bad
- [] checklessons and generate new ones is not working
- [x] Clarified that lesson.focusArea in UI is already user-friendly; normalizeTopic is for internal use only.
- [] disable redirect from onboarding when user is seeing results and waiting for lesson generation 

- [x] mobile ui for onboarding screens 




Okay, here is a detailed TODO list for migrating the current batch Google STT implementation to a real-time streaming approach using WebSockets.

```markdown
# TODO: Implement Real-Time Speech Recognition using Google Streaming STT

**Goal:** Replace the current batch STT (record -> stop -> send -> transcribe -> result) with a real-time streaming approach where audio is sent as it's recorded, and transcripts (interim and final) are received progressively.

---

## Phase 1: Backend Setup (WebSocket Server & Streaming STT Integration)

-   [ ] **Choose WebSocket Library:**
    -   Decide between `ws` (lower-level) or `socket.io` (more features). (`ws` is often sufficient).
    -   Install the chosen library (`npm install ws @types/ws` or `npm install socket.io`).
-   [ ] **Set up WebSocket Server:**
    -   **Integration Strategy:** Determine how the WebSocket server runs alongside Next.js (e.g., custom server setup, separate process, Vercel Edge function limitations - research required for deployment). *Initial development might use a simple Node.js server alongside the Next.js dev server.*
    -   **Server Initialization:** Create a basic WebSocket server instance (`new WebSocket.Server(...)`).
    -   **Connection Handling (`wss.on('connection', ...)`):**
        -   Establish logic for when a new client connects.
        -   Implement authentication/authorization (e.g., verify a token sent during handshake or initial message). Associate the WebSocket connection with the authenticated user ID.
        -   Prepare to manage state per connection (STT stream, config).
-   [ ] **Google Streaming STT Integration:**
    -   **Instantiate `SpeechClient`:** Reuse or adapt existing instantiation from `stt.service.ts`.
    -   **Create STT Stream per Connection:** For *each* new WebSocket connection:
        -   Call `speechClient.streamingRecognize()` to create a new duplex stream for Google STT.
        -   Handle potential errors during stream creation.
    -   **Configure `StreamingRecognitionConfig`:**
        -   Receive necessary config from the client on connection or first message (e.g., `languageCode`, potentially `sampleRateHertz`, `encoding`).
        -   Set `interimResults: true` to receive real-time updates.
        -   Set `singleUtterance: false` (usually default) to allow continuous speech.
        -   Set `enableAutomaticPunctuation: true`.
        -   Consider `model` selection.
    -   **Send Initial Config to Google:** Write the `StreamingRecognitionConfig` to the Google STT stream immediately after establishing it.
    -   **Handle Incoming Audio Chunks (WebSocket `onmessage`):**
        -   Define a message format (e.g., JSON or raw Buffer) for receiving audio chunks from the client.
        -   When an audio chunk message arrives via WebSocket:
            -   Forward the raw audio data (`audioContent`) to the corresponding Google STT stream (`googleStream.write({ audioContent: ... })`).
            -   Handle potential backpressure or errors from `googleStream.write`.
    -   **Handle Transcripts from Google (Google Stream `ondata`):**
        -   Listen for the `'data'` event on the Google STT stream.
        -   Process the received `StreamingRecognitionResult`.
        -   Distinguish between `isFinal: true` and `isFinal: false` (interim) results.
        -   Extract the transcript text (`result.alternatives[0].transcript`).
        -   Send the transcript (both interim and final) back to the *correct* client over its WebSocket connection. Define a message format (e.g., `{ type: 'interim' | 'final', transcript: '...' }`).
    -   **Handle Google Stream Errors (Google Stream `onerror`):**
        -   Listen for the `'error'` event on the Google STT stream.
        -   Log the error.
        -   Send an error message back to the client via WebSocket.
        -   Potentially close the WebSocket connection or the Google stream.
    -   **Handle Connection Closure (WebSocket `onclose`, Google Stream `onend`):**
        -   When a WebSocket connection closes (client disconnects):
            -   Ensure the corresponding Google STT stream is properly closed (`googleStream.end()`).
            -   Clean up any associated server-side resources/state.
        -   Handle the `'end'` event from the Google stream.
-   [ ] **State Management:**
    -   Implement a mechanism to map WebSocket connections to their respective Google STT streams and user context (e.g., using a `Map` with connection IDs or user IDs as keys).
-   [ ] **Deployment Considerations:**
    -   **Vercel:** Research limitations of Serverless/Edge functions for persistent WebSocket connections. May require a different hosting solution or architecture (e.g., Vercel Hobby with a custom server, or a dedicated WebSocket provider).
    -   **Other:** Configure environment (port, security) for the WebSocket server.

## Phase 2: Frontend Integration (`LessonChat.tsx`)

-   [ ] **WebSocket Client Implementation:**
    -   **Establish Connection:**
        -   Create a WebSocket connection (`new WebSocket(...)`) pointing to your backend WebSocket server URL. Manage the connection lifecycle (e.g., in a `useEffect` hook, connect on mount/when needed, disconnect on unmount).
        -   Handle potential connection errors.
    -   **`onopen` Handler:**
        -   Once connected, send an initial message containing necessary configuration (language code, user auth token if needed).
    -   **`onmessage` Handler:**
        -   Listen for messages from the server (interim transcripts, final transcripts, errors).
        -   Update component state based on received messages (e.g., update displayed transcript).
        -   Trigger `handleSubmitStep` *only* when a *final* transcript is received.
    -   **`onerror` Handler:**
        -   Handle WebSocket errors (e.g., display message to user, attempt reconnection).
    -   **`onclose` Handler:**
        -   Handle WebSocket closure (e.g., update UI state, cleanup).
-   [ ] **Adapt `MediaRecorder` Logic:**
    -   **`ondataavailable`:**
        -   Instead of pushing to `audioChunksRef`, directly send the `event.data` Blob over the *active* WebSocket connection.
        -   Consider chunk size (`timeslice` option in `mediaRecorder.start(timeslice)`) to send data frequently (e.g., every 100-250ms).
        -   Handle potential need to convert Blob to ArrayBuffer or Base64 before sending, depending on server expectations.
    -   **`startRecording`:**
        -   Initiate `MediaRecorder.start(timeslice)`.
        -   Ensure WebSocket connection is established *before* starting.
        -   Update UI state to "Recording".
    -   **`stopRecording`:**
        -   Call `mediaRecorder.stop()`.
        -   Send an "end of stream" message to the WebSocket server *if* your protocol requires it (Google STT often detects end of audio automatically, but explicit signal might be good).
        -   Update UI state (e.g., "Waiting for final transcript...").
        -   *Do not* process the final blob locally or send it in batch anymore.
-   [ ] **Update UI State & Controls:**
    -   **Microphone Button:** Logic changes:
        -   Idle -> Click -> Connecting WebSocket (show spinner?) -> Connected -> Start MediaRecorder & Send Config -> Recording (show stop/pause icon)
        -   Recording -> Click -> Stop MediaRecorder & Send End Signal (optional) -> Waiting for Final Transcript (show processing/disabled state?) -> Idle
    -   **Transcript Display:** Update the text area (`userResponse` state or a new `displayedTranscript` state) with *interim* results for immediate feedback. Overwrite with *final* results.
    -   **Submission:** Remove manual submission triggers (like silence detection based on Web Speech or Enter key). Submission is now implicitly triggered by the server sending a *final* transcript.
    -   **Feedback Area:** Display connection status, interim results, final results, and error messages clearly.
-   [ ] **Remove Batch STT Call:** Delete the code that calls the `transcribeAudio` server action from `onstop`.

## Phase 3: Configuration & Cleanup

-   [ ] **Environment Variables:**
    -   Add `NEXT_PUBLIC_WEBSOCKET_URL` (or similar) for the client to connect to.
    -   Update backend environment variables if needed (e.g., WebSocket port).
    -   Ensure Google Cloud credentials setup is documented and working for the chosen backend deployment strategy.
-   [ ] **Refactor & Cleanup:**
    -   Remove the `transcribeAudio` server action (or repurpose if still needed for other features).
    -   Clean up `LessonChat.tsx`: remove unused state (`isProcessingSTT`, maybe `audioChunksRef` if not needed elsewhere), simplify logic related to batch submission.
    -   Ensure robust error handling on both client and server for WebSocket issues and STT API errors.
-   [ ] **Documentation:** Update internal docs about the real-time architecture, WebSocket setup, and deployment considerations.

## Phase 4: Testing

-   [ ] **Backend WebSocket Server Tests:**
    -   Unit/Integration tests using a mock WebSocket client.
    -   Mock the Google `SpeechClient` and its streaming methods.
    -   Test connection lifecycle (connect, auth, disconnect).
    -   Test message routing (audio chunks -> Google, Google transcripts -> client).
    -   Test Google STT stream management (creation, error handling, closure).
    -   Test error propagation back to the client.
-   [ ] **Frontend `LessonChat.tsx` Tests:**
    -   Use `@testing-library/react`.
    -   Mock the global `WebSocket` object to simulate server interactions.
    -   Test establishing connection (`onopen`).
    -   Test sending audio data chunks via `mediaRecorder.ondataavailable`.
    -   Test receiving and displaying interim/final transcripts (`onmessage`).
    -   Test triggering `handleSubmitStep` on final transcript.
    -   Test UI state updates (button text/disabled state, feedback messages).
    -   Test error handling (`onerror`, `onclose`).
-   [ ] **End-to-End Testing:** Crucial for verifying the real-time flow. Test in various network conditions if possible.

## Phase 5: Potential Enhancements (Future TODOs)

-   [ ] Implement more sophisticated client-side silence detection (using `AudioContext`) to automatically stop recording/signal end-of-speech if Google's endpointing isn't sufficient.
-   [ ] Add robust WebSocket reconnection logic on the client.
-   [ ] Display word timings or confidence scores if enabled in Google STT config and sent back from the server.
-   [ ] Optimize audio chunk size and sending frequency.
-   [ ] Investigate alternative deployment strategies for WebSockets on Vercel (e.g., third-party services like Pusher, Ably, or managing a separate persistent server).

```