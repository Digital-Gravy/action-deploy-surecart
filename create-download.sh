#!/bin/bash
# Creates a new download object in SureCart.
set -e

# --- Main Logic ---
# Prepare temporary files for the API client to use.
RESPONSE_BODY_FILE=$(mktemp)
HTTP_STATUS_FILE=$(mktemp)
export RESPONSE_BODY_FILE HTTP_STATUS_FILE

# Construct the JSON payload for the create download request.
json_payload=$(printf '{
  "download": {
    "product": "%s",
    "media_id": "%s"
  }
}' "$PRODUCT_UUID" "$MEDIA_UUID")

# Call the SureCart API to create the download.
"$(dirname "$0")/surecart-api.sh" "POST" "/v1/downloads" "$json_payload"

# Read the results back from the temporary files.
http_status=$(cat "$HTTP_STATUS_FILE")
response_body=$(cat "$RESPONSE_BODY_FILE")

# Always output the response body for debugging.
echo "API Response Body:"
echo "$response_body"

# --- Error Handling ---
if [[ $http_status -lt 200 || $http_status -ge 300 ]]; then
  specific_error_message=$(echo "$response_body" | jq -r '.validation_errors[0].message' 2>/dev/null)
  
  if [[ "$specific_error_message" == "Media has already been taken" ]]; then
    media_id_from_error=$(echo "$response_body" | jq -r '.validation_errors[0].options.value')
    full_error="Deployment failed. The media file (UUID: ${media_id_from_error}) has already been used to create a download. Each release requires a new, unique media file to be uploaded first."
  else
    error_message=$(echo "$response_body" | jq -r '.message')
    full_error="API request failed with HTTP status code $http_status. Reason: $error_message"
  fi
  
  echo "::error::$full_error"
  echo "### :x: Deployment Failed" >> "$GITHUB_STEP_SUMMARY"
  echo "" >> "$GITHUB_STEP_SUMMARY"
  echo "**Error:** $full_error" >> "$GITHUB_STEP_SUMMARY"
  echo '```json' >> "$GITHUB_STEP_SUMMARY"
  echo "$response_body" >> "$GITHUB_STEP_SUMMARY"
  echo "" >> "$GITHUB_STEP_SUMMARY"
  echo '```' >> "$GITHUB_STEP_SUMMARY"
  exit 1
fi

# --- Success ---
download_id=$(echo "$response_body" | jq -r '.id')
echo "Created download with ID: ${download_id}"
echo "DOWNLOAD_ID=${download_id}" >> "$GITHUB_ENV"

echo "### :white_check_mark: Deployment Succeeded" >> "$GITHUB_STEP_SUMMARY"
echo "" >> "$GITHUB_STEP_SUMMARY"
echo "Successfully created download with HTTP status $http_status." >> "$GITHUB_STEP_SUMMARY"
echo '```json' >> "$GITHUB_STEP_SUMMARY"
echo "$response_body" >> "$GITHUB_STEP_SUMMARY"
echo "" >> "$GITHUB_STEP_SUMMARY"
echo '```' >> "$GITHUB_STEP_SUMMARY"
echo "Successfully created download. HTTP status: $http_status"
