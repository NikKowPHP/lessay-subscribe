
This is a new phase, focusing on modifying the **existing Flutter application** to communicate with the Next.js backend APIs we've previously outlined in the documentation.

---

**Flutter Frontend Integration: TODO #1**
Objective: Configure the Flutter application's API client to communicate with the Next.js backend and handle authentication.

---

1.  **Acknowledge & Understand:**
    *   I understand this task involves making foundational changes to the provided Flutter application. The goal is to enable its `ApiClient` to correctly target the Next.js backend and to include Supabase JWTs for authenticated requests. This also involves ensuring the Supabase Flutter SDK is set up for fetching these JWTs.

2.  **Breakdown (if necessary):**
    *   Verify/Update server URL configuration in `lib/config/config.dart`.
    *   Modify `lib/core/http/api_client.dart` to inject JWT into headers and enhance error handling.
    *   Ensure/Implement Supabase Flutter SDK setup for JWT retrieval, potentially by creating a new auth helper service.
    *   Review existing Flutter auth state management (`lib/core/user/user_provider.dart`, `lib/core/user/user_service.dart`) in light of direct Supabase SDK usage for JWTs.

3.  **Identify Affected Components (Flutter Codebase):**
    *   `lib/config/config.dart`: For backend server URL.
    *   `lib/core/http/api_client.dart`: For HTTP request logic, header modification, and error handling.
    *   `lib/main.dart` (or equivalent): For Supabase Flutter SDK initialization.
    *   Potentially new file: `lib/core/auth/supabase_auth_service.dart` (or similar) for Supabase Flutter SDK interactions and JWT retrieval.
    *   `pubspec.yaml`: To ensure `supabase_flutter` dependency is present.
    *   `lib/core/user/user_service.dart` and `lib/core/user/user_provider.dart`: While full auth logic rewrite is out of scope for *this* TODO, the mechanism for obtaining the JWT will affect how these might eventually interact with auth state.

4.  **Outline Implementation Approach:**

    *   **A. Update Server URL Configuration:**
        *   **File:** `lib/config/config.dart`
        *   **Action:** Modify the `Config.initialize()` method (or where `_serverUrl` is set). It currently loads `SERVER_URL` from `.env`.
        *   **Instruction for User/Orchestrator:** The `.env` file in the Flutter project must be updated with `SERVER_URL=<your_deployed_lessay_nextjs_backend_url>`.
        *   **Code Change:** No direct code change needed in `config.dart` if it correctly loads from `.env`, but ensure it's robust.

    *   **B. Supabase Flutter SDK Setup & JWT Retrieval:**
        *   **Dependency Check (`pubspec.yaml`):**
            *   Verify if `supabase_flutter` is listed as a dependency. If not, add it: `flutter pub add supabase_flutter`.
        *   **Initialization (`lib/main.dart`):**
            *   Ensure `Supabase.initialize()` is called with the *same* Supabase URL and Anon Key used by the Next.js backend. This is crucial for a unified auth system.
                ```dart
                // In main.dart
                await Supabase.initialize(
                  url: '<YOUR_SUPABASE_URL>', // From Next.js project's .env
                  anonKey: '<YOUR_SUPABASE_ANON_KEY>', // From Next.js project's .env
                );
                ```
        *   **Create Supabase Auth Helper (New File Recommended):**
            *   **File:** `lib/core/auth/supabase_auth_helper.dart` (or similar existing auth service if adaptable)
            *   **Content:**
                ```dart
                import 'package:supabase_flutter/supabase_flutter.dart';

                class SupabaseAuthHelper {
                  final SupabaseClient _client = Supabase.instance.client;

                  Future<String?> getCurrentSessionToken() async {
                    final session = _client.auth.currentSession;
                    return session?.accessToken;
                  }

                  Stream<AuthState> get onAuthStateChange => _client.auth.onAuthStateChange;

                  User? get currentUser => _client.auth.currentUser;

                  // Add other Supabase auth methods (login, logout, signup) here later
                  // For now, focus is on token retrieval for ApiClient
                }
                ```
            *   **Provider (Optional but Recommended):** Expose `SupabaseAuthHelper` via a Riverpod provider if it's to be used in multiple places.

    *   **C. Modify `ApiClient` for JWT and Enhanced Error Handling:**
        *   **File:** `lib/core/http/api_client.dart`
        *   **Import:** `import 'package:lessay_translate/core/auth/supabase_auth_helper.dart';` (or path to your helper)
        *   **Instantiate Helper (or get from provider):**
            ```dart
            // Inside ApiClient class or passed via constructor
            final SupabaseAuthHelper _authHelper = SupabaseAuthHelper(); // Or inject via provider
            ```
        *   **Modify `post`, `get` (and other HTTP methods):**
            *   Before `http.post` or `http.get`:
                ```dart
                final String? token = await _authHelper.getCurrentSessionToken();
                final Map<String, String> requestHeaders = {
                  'Content-Type': 'application/json',
                  if (token != null) 'Authorization': 'Bearer $token',
                  ...(headers ?? {}), // Merge existing headers
                };
                // Use requestHeaders in http.post/get
                ```
            *   Ensure `baseUrl` (now pointing to Next.js backend) is correctly used.
            *   **Error Handling Enhancement:**
                *   In the `catch (e)` block, and after checking `response.statusCode`:
                    *   Attempt to parse `response.body` as JSON if it's an error response.
                    *   Check for a structured error message from the Next.js backend (e.g., `jsonResponse['error']` or `jsonResponse['message']`).
                    *   Throw a more specific `AppException` (from `lib/core/exceptions/app_exception.dart`) with the message and status code.
                    *   The existing `ErrorHandlerService` (`lib/core/services/error_handler_service.dart`) can then be used in UI layers to display user-friendly messages based on these exceptions.
                ```dart
                // Example enhanced error handling in ApiClient post/get
                // ... inside try block after http call
                if (response.statusCode >= 200 && response.statusCode < 300) {
                  if (response.body.isEmpty) return {}; // Handle empty success response
                  final jsonResponse = jsonDecode(response.body);
                  if (jsonResponse['error'] != null) { // Assuming Next.js might send error in body even with 2xx
                    throw AppException(jsonResponse['error'].toString(), response.statusCode);
                  }
                  return jsonResponse;
                } else {
                  String errorMessage = 'Request failed with status: ${response.statusCode}';
                  try {
                    final jsonError = jsonDecode(response.body);
                    errorMessage = jsonError['error']?.toString() ?? jsonError['message']?.toString() ?? errorMessage;
                  } catch (_) {
                    // Failed to parse JSON error, use default message
                  }
                  logger.e('API Error: $errorMessage, Status: ${response.statusCode}, Body: ${response.body.substring(0, (response.body.length > 200) ? 200 : response.body.length)}');
                  throw AppException(errorMessage, response.statusCode);
                }
                // ... in catch (e)
                } catch (e) {
                  logger.e('ApiClient Error ($endpoint): $e');
                  if (e is AppException) rethrow;
                  throw AppException('Network error or unexpected issue occurred.', null);
                }
                ```

    *   **D. Review Existing Flutter Auth State Management:**
        *   **Files:** `lib/core/user/user_service.dart`, `lib/core/user/user_provider.dart`.
        *   **Note:** The current `UserService.dart` is a mock (`return UserModel.local()`). A full refactor to use `SupabaseAuthHelper` for login, signup, logout, and user state changes via `onAuthStateChange` will be a *separate, subsequent TODO*.
        *   For *this* TODO, the critical part is that `SupabaseAuthHelper` can provide the JWT. The existing `UserProvider` might need to be updated to reflect the user state from `Supabase.instance.client.auth.currentUser` and `onAuthStateChange`.

5.  **Identify Potential Challenges/Dependencies:**
    *   **Supabase Flutter SDK:** Ensuring `supabase_flutter` is correctly added and initialized.
    *   **JWT Availability:** The logic to retrieve the JWT must be robust.
    *   **Next.js Backend Deployment:** The Flutter app needs a deployed Next.js backend URL to target.
    *   **CORS:** The Next.js backend must be configured to accept requests from the Flutter app's origin (though for mobile apps, CORS is typically less of an issue than for web-to-web, server-side configuration for allowed origins might still be relevant depending on deployment).
    *   **Error Structure Alignment:** The Flutter app's error handling needs to anticipate the error structure returned by the Next.js APIs.

6.  **Consider Edge Cases/Testing (Briefly):**
    *   **No JWT:** `ApiClient` should handle cases where no JWT is available (user not logged in). For protected routes, it should probably not make the call or the backend should return a 401.
    *   **Expired JWT:** Supabase Flutter SDK should handle refreshes. If a refresh fails and an expired token is sent, the Next.js backend should return 401. `ApiClient` should handle this.
    *   **Testing:**
        *   Unit test `SupabaseAuthHelper` (if created) to ensure it correctly interacts with a mocked Supabase client.
        *   Unit test `ApiClient` methods to verify:
            *   JWT is added to headers correctly.
            *   Requests are made to the correct base URL + endpoint.
            *   Successful responses are parsed.
            *   Error responses from Next.js (e.g., 401, 403, 500 with JSON body) are handled and result in appropriate `AppException`s.

7.  **(Optional) Estimate Relative Effort:**
    *   **Medium.** This involves touching several core parts of the Flutter app (config, HTTP client, auth utilities) and requires careful setup of Supabase SDK.

---
This completes the plan for Flutter Frontend Integration: TODO #1. I await your confirmation to proceed or if you have further instructions.