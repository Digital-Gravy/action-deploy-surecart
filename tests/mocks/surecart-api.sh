#!/bin/bash
# This is a mock of the surecart-api.sh script for testing purposes.
# It does not make any real network calls.

# It records the arguments it was called with to a file for tests to inspect.
echo "$@" > "$MOCK_API_CALL_ARGS_FILE"

# It simulates an API response by copying a predefined fixture file
# to the response body file and writing a status to the status file.
if [[ -n "$MOCK_API_RESPONSE_FIXTURE" && -f "$MOCK_API_RESPONSE_FIXTURE" ]]; then
  cp "$MOCK_API_RESPONSE_FIXTURE" "$RESPONSE_BODY_FILE"
fi

echo "$MOCK_API_HTTP_STATUS" > "$HTTP_STATUS_FILE"

exit 0
