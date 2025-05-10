



# TODO

-[] check lessons generation and progress tracking
- [] lesson generation prompt is very bad
- [] checklessons and generate new ones is not working
- [x] Clarified that lesson.focusArea in UI is already user-friendly; normalizeTopic is for internal use only.
- [] disable redirect from onboarding when user is seeing results and waiting for lesson generation 

- [x] mobile ui for onboarding screens 






# TODO: Integrate Google Cloud Speech-to-Text v1 API into LessonChat

**Goal:** Replace the browser's Web Speech API (`webkitSpeechRecognition`) with the server-processed Google Cloud Speech-to-Text v1 API for more reliable and consistent speech recognition across browsers and potentially better accuracy.

---

## Phase 1: Backend Setup (API Endpoint / Server Action)

-   [x] **Install Google Cloud Speech Client Library:**
    -   Add `@google-cloud/speech` to project dependencies (`npm install @google-cloud/speech` or equivalent).
-   [x] **Set up Google Cloud Authentication:**
    -   Create a Google Cloud Service Account with the "Cloud Speech API User" role.
    -   Download the service account key JSON file.
    -   **Securely** store the credentials:
        -   Option A: Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of the key file (preferred for local/server environments).
        -   Option B: Store the key file content in a secure environment variable (e.g., `GOOGLE_CREDENTIALS_BASE64`) and configure the client library to use it.
    -   Update `.env.example` and documentation regarding necessary Google Cloud credentials.
    -   Ensure the key file is added to `.gitignore`.
-   [x] **Create Backend API Route/Server Action:**
    -   Create a **Server Action** in `src/lib/server-actions/stt-actions.ts`.
    -   The Server Action should be an exported async function (e.g., `export async function transcribeAudio(formData: FormData)`) that receives audio data and metadata from the client.
    -   Ensure the Server Action is invoked from the frontend using the framework's server action mechanism (e.g., `formAction`, `use server`, or similar).
-   [x] **Implement Audio Reception:**
    -   Update the Server Action to accept audio data via a `FormData` parameter (for `multipart/form-data` uploads).
    -   Extract the audio file/blob and any metadata (e.g., `targetLanguage`, `sampleRate`) from the `FormData` object.
    -   Validate the received data and handle errors gracefully.
-   [x] **Implement Google STT API Call:**
    -   Instantiate the Google Cloud Speech client using the configured credentials.
    -   Configure the `RecognitionConfig`:
        -   Set `encoding` (e.g., `WEBM_OPUS` if using MediaRecorder with default Opus, `LINEAR16` if sending raw PCM).
        -   Set `sampleRateHertz` (e.g., 48000 for Opus, 16000 or higher for LINEAR16). **Crucial for accuracy.**
        -   Set `languageCode` based on the `targetLanguage` passed from the client.
        -   Enable `automaticPunctuation`.
        -   Consider `model` selection (e.g., `telephony`, `latest_long`, `medical_dictation` - `default` or `telephony_short` might be suitable).
        -   Set `enableWordTimeOffsets` or `enableWordConfidence` if needed for advanced feedback later.
    -   Configure the `RecognitionAudio`:
        -   Pass the received audio `content` (as Base64 string or Buffer).
    -   Make the `recognize` API call to Google Cloud STT.
-   [x] **Handle API Response:**
    -   Process the response from Google Cloud STT.
    -   Extract the transcript from the `results`. Handle cases with multiple results or alternatives if necessary (usually take the first result's first alternative with highest confidence).
    -   Handle potential errors returned by the Google API (e.g., authentication errors, quota limits, invalid arguments).
-   [x] **Return Transcript to Client:**
    -   Send the extracted transcript (or an error message) back to the client in a structured JSON response.
-   [x] **Add Authentication/Authorization:**
    -   Secure the backend endpoint/action. Ensure only authenticated users associated with the lesson can submit STT requests. Use Supabase session validation.

## Phase 2: Frontend Integration (`LessonChat.tsx`)

-   [x] **Remove Web Speech API Integration:**
    -   Delete all code related to `window.webkitSpeechRecognition`.
    -   Remove state variables like `isListening`, `recognitionRef`, `realtimeTranscript` (or repurpose `isListening` to mean "processing on server").
    -   Remove event handlers (`onstart`, `onresult`, `onerror`, `onend`).
    -   Remove silence detection logic based on Web Speech API results (`silenceTimerRef` related to `onresult`).
-   [x] **Adapt Audio Recording Logic:**
    -   Keep the `MediaRecorder` setup (`initializeRecorder`, `startRecording`, `pauseRecording`, `stopRecordingCompletely`).
    -   Ensure `mediaRecorder.onstop` correctly gathers the audio chunks into a final `Blob` or `File` object.
-   [x] **Implement Audio Sending:**
    -   Modify the `stopRecording` (or a new `sendAudioToServer`) function:
        -   When recording stops (manually or automatically), get the final audio `Blob`/`File`.
        -   Use `fetch` or a library like `axios` to send this audio data to the new backend API endpoint/action created in Phase 1.
        -   Use `FormData` to package the audio blob/file along with metadata (target language code).
        -   Set `isProcessing` state to true while waiting for the server response.
-   [x] **Handle Server Response:**
    -   Receive the transcript response from the backend endpoint/action.
    -   On successful response:
        -   Update the `userResponse` state with the received transcript.
        -   Trigger the `handleSubmitStep` logic using the received transcript.
        -   Set `isProcessing` state to false.
    -   On error response:
        -   Display an appropriate error message to the user (update `feedback` state or use toast).
        -   Set `isProcessing` state to false.
-   [x] **Update UI State and Controls:**
    -   Modify the `ChatInput` component and the main microphone button logic:
        -   The button should now toggle `startRecording` and `stopRecording`.
        -   While recording, the button could show a "Stop Recording" state.
        -   After stopping and sending, display a "Processing..." state (using `isProcessing`). Disable the button during processing.
        -   Remove the visual "Listening..." indicator tied to the old Web Speech API state.
        -   The text area (`userResponse`) should primarily display the *final* transcript received from the server, not real-time updates. Consider clearing it before starting a new recording.
-   [x] **Refine Silence Detection (Client-Side):**
    -   The previous silence detection relied on `onresult`. A new approach is needed if auto-submission after pauses is desired.
    -   Option A (Simpler): Remove auto-submission. User explicitly clicks "Stop Recording" or a "Submit" button after speaking.
    -   Option B (More Complex): Implement client-side silence detection using `AudioContext` and `AnalyserNode` to monitor the input stream *during* recording and call `stopRecording` automatically after a pause. This adds significant complexity. Start with Option A.

## Phase 3: Configuration & Cleanup

-   [ ] **Environment Variables:**
    -   Ensure `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_CREDENTIALS_BASE64` is configured correctly in all relevant environments (local, Vercel).
-   [ ] **Refactor & Cleanup:**
    -   Remove unused state variables, refs, and functions related to Web Speech API.
    -   Ensure consistent error handling and user feedback.
    -   Review component props and context interactions.
-   [ ] **Documentation:**
    -   Update any internal documentation regarding the STT implementation change and necessary setup (Google Cloud).

## Phase 4: Testing

-   [ ] **Backend Endpoint/Action Tests:**
    -   Write unit/integration tests for the API route/server action.
    -   Mock the Google Cloud Speech client.
    -   Test successful transcript generation.
    -   Test handling of invalid audio data.
    -   Test handling of Google API errors (e.g., auth, quota).
    -   Test authentication/authorization logic.
-   [ ] **Frontend Component Tests (`LessonChat.tsx`):**
    -   Update existing tests or write new ones using `@testing-library/react`.
    -   Mock `fetch` calls to the backend STT endpoint.
    -   Test starting and stopping recording.
    -   Test the "Processing..." state update.
    -   Test handling of successful transcript responses (updating `userResponse`, calling `handleSubmitStep`).
    -   Test handling of error responses from the backend.
    -   Verify UI changes (button states, feedback messages).
-   [ ] **End-to-End Testing (Manual/Automated):**
    -   Perform manual tests in different browsers to ensure recording and STT processing work correctly.
    -   Consider automated E2E tests if feasible.

## Phase 5: Potential Enhancements (Future TODOs)

-   [ ] **Implement Streaming Recognition:**
    -   Replace the batch POST request with a WebSocket connection.
    -   Stream audio chunks from `MediaRecorder` (`ondataavailable`) to the backend.
    -   Backend streams audio to Google STT Streaming API.
    -   Backend sends back interim and final transcripts via WebSocket.
    -   Update frontend to display interim results for better UX.
-   [ ] **Improve Error Handling:** Provide more specific feedback based on Google API error codes.
-   [ ] **Optimize Audio Format/Encoding:** Experiment with different encodings (`LINEAR16`, `FLAC`) and sample rates for cost/accuracy balance.
-   [ ] **Advanced Configuration:** Allow users to select specific recognition models or features if applicable.

---
