#!/bin/bash
# Sets the current release download for a product in SureCart.
set -e

# --- Main Logic ---
RESPONSE_BODY_FILE=$(mktemp)
HTTP_STATUS_FILE=$(mktemp)
export RESPONSE_BODY_FILE HTTP_STATUS_FILE

echo "Setting download as the current release for download ID: $DOWNLOAD_ID"
json_payload=$(printf '{"product":{"current_release_download":"%s"}}' "$DOWNLOAD_ID")
echo "Using payload: $json_payload"

# Call the API to set the release.
"$(dirname "$0")/surecart-api.sh" "PATCH" "/v1/products/${PRODUCT_UUID}" "$json_payload"

http_status=$(cat "$HTTP_STATUS_FILE")
response_body=$(cat "$RESPONSE_BODY_FILE")

echo "API Response Body:"
echo "$response_body"

# --- Error Handling ---
if [[ $http_status -lt 200 || $http_status -ge 300 ]]; then
  error_message=$(echo "$response_body" | jq -r '.message')
  full_error="API request failed with HTTP status code $http_status. Reason: $error_message"
  echo "::error::$full_error"
  echo "### :x: Failed to Set Current Release" >> "$GITHUB_STEP_SUMMARY"
  echo "" >> "$GITHUB_STEP_SUMMARY"
  echo "**Error:** $full_error" >> "$GITHUB_STEP_SUMMARY"
  echo '```json' >> "$GITHUB_STEP_SUMMARY"
  echo "$response_body" >> "$GITHUB_STEP_SUMMARY"
  echo "" >> "$GITHUB_STEP_SUMMARY"
  echo '```' >> "$GITHUB_STEP_SUMMARY"
  exit 1
fi

# --- Success ---
echo "### :white_check_mark: Current Release Set" >> "$GITHUB_STEP_SUMMARY"
echo "" >> "$GITHUB_STEP_SUMMARY"
echo "Successfully set current release with HTTP status $http_status." >> "$GITHUB_STEP_SUMMARY"
echo '```json' >> "$GITHUB_STEP_SUMMARY"
echo "$response_body" >> "$GITHUB_STEP_SUMMARY"
echo "" >> "$GITHUB_STEP_SUMMARY"
echo '```' >> "$GITHUB_STEP_SUMMARY"
echo "Successfully set current release with HTTP status: $http_status"
