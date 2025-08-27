#!/bin/bash
# This is the main entrypoint for the composite action.
set -e

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

  # Run the create-download script, passing variables as env vars.
  # The script will export DOWNLOAD_ID to the environment for the next step.
  export SURECART_API_TOKEN="${INPUT_SURECART_API_TOKEN}"
  export MEDIA_UUID="${INPUT_MEDIA_UUID}"
  export PRODUCT_UUID="${product_uuid}"
  
  ./create-download.sh

  # If the set_as_current_release flag is true, run the next step.
  if [[ "${INPUT_SET_AS_CURRENT_RELEASE}" == "true" ]]; then
    # The DOWNLOAD_ID is already in the environment from the previous step.
    ./set-release.sh
  fi

  echo "--- Finished deployment for product: ${product_uuid} ---"
done
