#!/bin/bash
# A centralized client for making authenticated requests to the SureCart API.
#
# Usage:
#   ./surecart-api.sh <METHOD> <ENDPOINT> [JSON_PAYLOAD]
#
# Arguments:
#   METHOD: The HTTP method (e.g., POST, PATCH).
#   ENDPOINT: The API endpoint path (e.g., /v1/downloads).
#   JSON_PAYLOAD: (Optional) The JSON data to send in the request body.
#
# Environment Variables:
#   SURECART_API_TOKEN: Must be set for authentication.
#   HTTP_STATUS_FILE: A path to a temporary file to store the HTTP status code.
#   RESPONSE_BODY_FILE: A path to a temporary file to store the response body.
#
# Output:
#   On failure, exits with a non-zero status code.

set -e

# --- Input Validation ---
if [[ -z "$SURECART_API_TOKEN" ]]; then
  echo "::error::SURECART_API_TOKEN environment variable is not set." >&2
  exit 1
fi

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "::error::Usage: $0 <METHOD> <ENDPOINT> [JSON_PAYLOAD]" >&2
  exit 1
fi

if [[ -z "$HTTP_STATUS_FILE" || -z "$RESPONSE_BODY_FILE" ]]; then
    echo "::error::HTTP_STATUS_FILE and RESPONSE_BODY_FILE must be set." >&2
    exit 1
fi

METHOD="$1"
ENDPOINT="$2"
JSON_PAYLOAD="$3"

# --- Build curl command ---
curl_args=(
  --request "$METHOD"
  --url "https://api.surecart.com${ENDPOINT}"
  --verbose
  --header 'Accept: application/json'
  --header "Authorization: Bearer ${SURECART_API_TOKEN}"
  --output "$RESPONSE_BODY_FILE"
  --write-out "%{http_code}"
)

# Add payload if provided
if [[ -n "$JSON_PAYLOAD" ]]; then
  curl_args+=(--header 'Content-Type: application/json' --data "$JSON_PAYLOAD")
fi

# --- Execute curl ---
http_status=$(curl "${curl_args[@]}")
echo "$http_status" > "$HTTP_STATUS_FILE"
