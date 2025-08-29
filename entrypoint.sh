#!/bin/bash
# This is the main entrypoint for the composite action.
set -e
# Add the action's directory to the PATH.
# This allows scripts to call each other without using relative paths.
export PATH="${GITHUB_ACTION_PATH}:${PATH}"

# Change to the action's directory to ensure scripts can be found.
cd "${GITHUB_ACTION_PATH}"

# --- Make scripts executable ---
chmod +x ./create-download.sh
chmod +x ./set-release.sh
chmod +x ./surecart-api.sh

# --- Read and process inputs ---
# Remove all spaces and split the comma-separated string into an array.
IFS=',' read -r -a product_uuids <<< "${INPUT_PRODUCT_UUIDS// /}"

# --- Main Logic Loop ---
# Loop over each product UUID and run the deployment steps.
for product_uuid in "${product_uuids[@]}"; do
  echo "--- Starting deployment for product: ${product_uuid} ---"

  # Run the create-download script, passing variables as env vars,
  # and capture its stdout (the new download_id) into a variable.
  export SURECART_API_TOKEN="${INPUT_SURECART_API_TOKEN}"
  export MEDIA_UUID="${INPUT_MEDIA_UUID}"
  export PRODUCT_UUID="${product_uuid}"
  export DUPLICATE_MEDIA_BEHAVIOR="${INPUT_DUPLICATE_MEDIA_BEHAVIOR}"
  
  new_download_id=$(./create-download.sh)

  # If the set_as_current_release flag is true, run the next step.
  if [[ "${INPUT_SET_AS_CURRENT_RELEASE}" == "true" ]]; then
    # Check if we got a real download ID or a duplicate media placeholder
    if [[ "${new_download_id}" == "duplicate-media-no-new-download" ]]; then
      echo "⚠️  Skipping current release setting - no new download was created due to duplicate media" >&2
    else
      # Pass the captured download_id to the set-release script.
      export DOWNLOAD_ID="${new_download_id}"
      ./set-release.sh
    fi
  fi

  echo "--- Finished deployment for product: ${product_uuid} ---"
done
