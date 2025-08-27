#!/bin/bash
# Sets the current release download for a product in SureCart.
set -e

# --- Main Logic ---
RESPONSE_BODY_FILE=$(mktemp)
HTTP_STATUS_FILE=$(mktemp)
export RESPONSE_BODY_FILE HTTP_STATUS_FILE

echo "Setting download as the current release for download ID: $DOWNLOAD_ID" >&2

# Use an environment variable to allow for a mock API client in tests.
api_client="${SURECART_API_CLIENT_PATH:-$(dirname "$0")/surecart-api.sh}"

json_payload=$(printf '{"product":{"current_release_download":"%s"}}' "$DOWNLOAD_ID")
echo "Using payload: $json_payload" >&2

# Call the API to set the release.
"$api_client" "PATCH" "/v1/products/${PRODUCT_UUID}" "$json_payload"

http_status=$(cat "$HTTP_STATUS_FILE")
response_body=$(cat "$RESPONSE_BODY_FILE")
echo "API Response Body:" >&2
echo "$response_body" >&2

# --- Error Handling ---
# First, check for a non-successful HTTP status.
if [[ $http_status -lt 200 || $http_status -ge 300 ]]; then
  error_message=$(jq -r '.message' <<< "$response_body" 2>/dev/null || echo "Unknown error")
  full_error="API request failed with HTTP status code $http_status. Reason: $error_message"
  echo "::error::$full_error" >&2
  {
    echo "### :x: Failed to Set Current Release"
    echo ""
    echo "**Error:** $full_error"
    echo '```json'
    echo "$response_body"
    echo ""
    echo '```'
  } >> "$GITHUB_STEP_SUMMARY"
  exit 1
fi

# Second, on a successful request, check if the release was actually set.
if [[ $(echo "$response_body" | jq -r '.current_release_download') == "null" ]]; then
  full_error="API call succeeded, but 'current_release_download' is still null. The update was not applied."
  echo "::error::$full_error" >&2
  {
    echo "### :x: Failed to Set Current Release"
    echo ""
    echo "**Error:** $full_error"
    echo '```json'
    echo "$response_body"
    echo ""
    echo '```'
  } >> "$GITHUB_STEP_SUMMARY"
  exit 1
fi

# --- Success Case ---
{
  echo "### :white_check_mark: Current Release Set"
  echo ""
  echo "Successfully set current release with HTTP status $http_status."
  echo '```json'
  echo "$response_body"
  echo ""
  echo '```'
} >> "$GITHUB_STEP_SUMMARY"
echo "Successfully set current release with HTTP status: $http_status" >&2
