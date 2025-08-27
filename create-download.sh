#!/bin/bash
# Creates a new download object in SureCart.
# On success, it prints ONLY the new download ID to stdout.
# All other logging is sent to stderr to not interfere with output capturing.
set -e

# --- Main Logic ---
# Prepare temporary files for the API client to use.
RESPONSE_BODY_FILE=$(mktemp)
HTTP_STATUS_FILE=$(mktemp)
export RESPONSE_BODY_FILE HTTP_STATUS_FILE
            
# Use an environment variable to allow for a mock API client in tests.
api_client="${SURECART_API_CLIENT_PATH:-$(dirname "$0")/surecart-api.sh}"

json_payload=$(printf '{
  "download": {
    "product": "%s",
    "media_id": "%s"
  }
}' "$PRODUCT_UUID" "$MEDIA_UUID")
"$api_client" "POST" "/v1/downloads" "$json_payload"

# Read the results back from the temporary files.
http_status=$(cat "$HTTP_STATUS_FILE")
response_body=$(cat "$RESPONSE_BODY_FILE")
            
# --- Error Handling ---
if [[ $http_status -lt 200 || $http_status -ge 300 ]]; then
  # Use `|| echo ""` to prevent `jq` from exiting the script if the path doesn't exist.
  specific_error_message=$(jq -r '.validation_errors[0].message' <<< "$response_body" 2>/dev/null || echo "")
  
  if [[ "$specific_error_message" == "Media has already been taken" ]]; then
    media_id_from_error=$(jq -r '.validation_errors[0].options.value' <<< "$response_body")
    full_error="Deployment failed. The media file (UUID: ${media_id_from_error}) has already been used to create a download. Each release requires a new, unique media file to be uploaded first."
  else
    error_message=$(jq -r '.message' <<< "$response_body" 2>/dev/null || echo "")
    full_error="API request failed with HTTP status code $http_status. Reason: $error_message"
  fi
  
  echo "::error::$full_error" >&2
  {
    echo "### :x: Deployment Failed"
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
download_id=$(echo "$response_body" | jq -r '.id')
{
  echo "### :white_check_mark: Deployment Succeeded"
  echo ""
  echo "Successfully created download with HTTP status $http_status."
  echo '```json'
  echo "$response_body"
  echo ""
  echo '```'
} >> "$GITHUB_STEP_SUMMARY"

# On success, print ONLY the download ID to stdout.
echo "$download_id"
