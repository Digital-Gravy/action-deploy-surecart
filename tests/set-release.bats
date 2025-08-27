#!/usr/bin/env bats

load 'bats-support/load'
load 'bats-assert/load'

# --- Test Setup ---
setup() {
  BATS_TMPDIR=$(mktemp -d)
  export PATH="${BATS_TEST_DIRNAME}/mocks:${PATH}"
  export MOCK_API_CALL_ARGS_FILE="${BATS_TMPDIR}/mock_api_call_args"
  export GITHUB_STEP_SUMMARY="${BATS_TMPDIR}/summary.md"
  
  # Provide dummy environment variables that the script expects.
  export DOWNLOAD_ID="4391ffb4-6bdd-46ec-8e8f-c7ca80179123"
  export SURECART_API_TOKEN="dummy-token-for-testing"
  
  # Point the script under test to our mock API client.
  export SURECART_API_CLIENT_PATH="${BATS_TEST_DIRNAME}/mocks/surecart-api.sh"
}

teardown() {
  rm -rf "$BATS_TMPDIR"
}

# --- Test Cases for set-release.sh ---

@test "set-release.sh: handles successful API response" {
  # --- Arrange ---
  export MOCK_API_HTTP_STATUS=200
  export MOCK_API_RESPONSE_FIXTURE="${BATS_TEST_DIRNAME}/fixtures/set-release-success.json"
  
  # --- Act ---
  run "${BATS_TEST_DIRNAME}/../set-release.sh"
  
  # --- Assert ---
  assert_success
}

@test "set-release.sh: handles silent failure where current_release_download is null" {
  # --- Arrange ---
  export MOCK_API_HTTP_STATUS=200
  export MOCK_API_RESPONSE_FIXTURE="${BATS_TEST_DIRNAME}/fixtures/set-release-null-error.json"
  
  # --- Act ---
  run "${BATS_TEST_DIRNAME}/../set-release.sh"
  
  # --- Assert ---
  assert_failure 1
  assert_line --partial "API call succeeded, but 'current_release_download' is still null."
}

@test "set-release.sh: handles generic API error" {
  # --- Arrange ---
  export MOCK_API_HTTP_STATUS=401
  export MOCK_API_RESPONSE_FIXTURE="${BATS_TEST_DIRNAME}/fixtures/generic-unauthorized-error.json"
  
  # --- Act ---
  run "${BATS_TEST_DIRNAME}/../set-release.sh"

  # --- Assert ---
  assert_failure 1
  assert_line --partial "API request failed with HTTP status code 401. Reason: Invalid API token provided."
}
