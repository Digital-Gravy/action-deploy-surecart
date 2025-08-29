#!/usr/bin/env bats

load 'bats-support/load'
load 'bats-assert/load'

# --- Test Setup ---
setup() {
  # Create a temporary directory for test artifacts.
  BATS_TMPDIR=$(mktemp -d)
  
  # Set up environment variables that the mock API script and the script under test expect.
  export MOCK_API_CALL_ARGS_FILE="${BATS_TMPDIR}/mock_api_call_args"
  export GITHUB_STEP_SUMMARY="${BATS_TMPDIR}/summary.md"
  export SURECART_API_TOKEN="dummy-token-for-testing"

  # Point the script under test to our mock API client.
  export SURECART_API_CLIENT_PATH="${BATS_TEST_DIRNAME}/mocks/surecart-api.sh"
}

teardown() {
  # Clean up the temporary directory.
  rm -rf "$BATS_TMPDIR"
}

# --- Test Cases for create-download.sh ---

@test "create-download.sh: handles successful API response" {
  # --- Arrange ---
  # Tell the mock API to simulate a 200 OK response with the success fixture.
  export MOCK_API_HTTP_STATUS=200
  export MOCK_API_RESPONSE_FIXTURE="${BATS_TEST_DIRNAME}/fixtures/create-download-success.json"
  
  # --- Act ---
  # Run the script under test and capture its output and status.
  run "${BATS_TEST_DIRNAME}/../create-download.sh"
  
  # --- Assert ---
  assert_success
  assert_output "4391ffb4-6bdd-46ec-8e8f-c7ca80179123"
}

@test "create-download.sh: handles 'media taken' with warn behavior (default)" {
  # --- Arrange ---
  export MOCK_API_HTTP_STATUS=422
  export MOCK_API_RESPONSE_FIXTURE="${BATS_TEST_DIRNAME}/fixtures/create-download-media-taken-error.json"
  export DUPLICATE_MEDIA_BEHAVIOR="warn"
  
  # --- Act ---
  run "${BATS_TEST_DIRNAME}/../create-download.sh"
  
  # --- Assert ---
  assert_success
  assert_line --partial "The media file (UUID: 8cc4a4e0-102b-4266-a81e-4aef9ff5713c) has already been used"
  assert_line "duplicate-media-no-new-download"
}

@test "create-download.sh: handles 'media taken' with error behavior" {
  # --- Arrange ---
  export MOCK_API_HTTP_STATUS=422
  export MOCK_API_RESPONSE_FIXTURE="${BATS_TEST_DIRNAME}/fixtures/create-download-media-taken-error.json"
  export DUPLICATE_MEDIA_BEHAVIOR="error"
  
  # --- Act ---
  run "${BATS_TEST_DIRNAME}/../create-download.sh"
  
  # --- Assert ---
  assert_failure 1
  assert_line --partial "Deployment failed. The media file (UUID: 8cc4a4e0-102b-4266-a81e-4aef9ff5713c) has already been used"
}

@test "create-download.sh: defaults to warn behavior when DUPLICATE_MEDIA_BEHAVIOR is unset" {
  # --- Arrange ---
  export MOCK_API_HTTP_STATUS=422
  export MOCK_API_RESPONSE_FIXTURE="${BATS_TEST_DIRNAME}/fixtures/create-download-media-taken-error.json"
  # Explicitly unset the environment variable to test default behavior
  unset DUPLICATE_MEDIA_BEHAVIOR
  
  # --- Act ---
  run "${BATS_TEST_DIRNAME}/../create-download.sh"
  
  # --- Assert ---
  assert_success
  assert_line --partial "The media file (UUID: 8cc4a4e0-102b-4266-a81e-4aef9ff5713c) has already been used"
  assert_line "duplicate-media-no-new-download"
}

@test "create-download.sh: validates DUPLICATE_MEDIA_BEHAVIOR parameter" {
  # --- Arrange ---
  export DUPLICATE_MEDIA_BEHAVIOR="invalid_value"
  
  # --- Act ---
  run "${BATS_TEST_DIRNAME}/../create-download.sh"
  
  # --- Assert ---
  assert_failure 1
  assert_line --partial "Invalid duplicate_media_behavior value: 'invalid_value'. Must be 'warn' or 'error'."
}

@test "create-download.sh: handles generic API error" {
  # --- Arrange ---
  export MOCK_API_HTTP_STATUS=401
  export MOCK_API_RESPONSE_FIXTURE="${BATS_TEST_DIRNAME}/fixtures/generic-unauthorized-error.json"
  
  # --- Act ---
  run "${BATS_TEST_DIRNAME}/../create-download.sh"

  # --- Assert ---
  assert_failure 1
  assert_line --partial "API request failed with HTTP status code 401. Reason: Invalid API token provided."
}
