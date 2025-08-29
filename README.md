# Deploy to SureCart Action

[![CI](https://github.com/Digital-Gravy/action-deploy-surecart/actions/workflows/ci.yml/badge.svg)](https://github.com/Digital-Gravy/action-deploy-surecart/actions/workflows/ci.yml)

This GitHub Action automates the process of deploying a new release to SureCart. It takes a media UUID and one or more product UUIDs, creates the necessary download objects, and optionally promotes the new download to be the current release for the specified products.

## How It Works

The action performs the following steps for each product UUID provided:
1.  Calls the SureCart API to create a new "download" object, linking your product to the provided media file.
2.  If `set_as_current_release` is `true`, it makes a second API call to update the product, setting the new download as the current release.

## Inputs

| Input                    | Required | Description                                                          | Default |
| ------------------------ | :------: | -------------------------------------------------------------------- | ------- |
| `media_uuid`             |  `true`  | The media UUID of the uploaded release file.                        |         |
| `product_uuids`          |  `true`  | A comma-separated list of Product UUIDs to deploy to.               |         |
| `set_as_current_release` | `false`  | Set this download as the current release for the product(s).        | `false` |
| `duplicate_media_behavior`| `false` | How to handle duplicate media: `warn` (show warning, continue) or `error` (fail workflow). | `warn`  |
| `surecart_api_token`     |  `true`  | The SureCart API token for authentication.                          |         |

## Duplicate Media Handling

The action provides flexible handling of duplicate media through the `duplicate_media_behavior` parameter:

### `warn` (Default)
When you try to use a media UUID that has already been used:
- Shows a **warning** instead of failing
- Continues the workflow execution
- Skips the current release setting step (if enabled)
- Displays: `⚠️ Duplicate Media Warning`

### `error` (Strict Mode)
When you try to use a media UUID that has already been used:
- **Fails the workflow** with an error
- Stops execution immediately
- Displays: `❌ Deployment Failed`

### Use Cases

**`warn` mode** is useful for:
- **Testing scenarios** where you want to reuse the same media file
- **Development workflows** where you might deploy the same build multiple times
- **Situations where workflow failure is not desired** for duplicate media

**`error` mode** is useful for:
- **Production deployments** where duplicate media should never occur
- **Strict CI/CD pipelines** that require unique media for each release
- **Environments where failures should be explicit**

## Usage

Here is an example of how to use this action in your own workflow. This workflow is triggered manually and prompts for the necessary inputs.

```yaml
name: Deploy New Release

on:
  workflow_dispatch:
    inputs:
      media_uuid:
        description: 'The media UUID of the uploaded release file.'
        required: true
      product_uuids:
        description: 'A comma-separated list of Product UUIDs to deploy to.'
        required: true
        default: 'product-uuid-1, product-uuid-2'
      set_as_current_release:
        description: 'Set this download as the current release for the product(s).'
        type: boolean
        default: true

jobs:
  deploy:
    name: Deploy to SureCart
    runs-on: ubuntu-latest
    steps:
      - name: Run SureCart Deploy Action
        # It's recommended to pin this to a specific version tag (e.g., @v1) for production workflows.
        uses: Digital-Gravy/action-deploy-surecart@main
        with:
          media_uuid: ${{ inputs.media_uuid }}
          product_uuids: ${{ inputs.product_uuids }}
          set_as_current_release: ${{ inputs.set_as_current_release }}
          surecart_api_token: ${{ secrets.SURECART_API_TOKEN }}
```

### Example: Strict Mode (Fail on Duplicate Media)

```yaml
- name: Deploy to SureCart (Strict Mode)
  uses: Digital-Gravy/action-deploy-surecart@main
  with:
    media_uuid: ${{ inputs.media_uuid }}
    product_uuids: ${{ inputs.product_uuids }}
    set_as_current_release: true
    duplicate_media_behavior: error  # Fail workflow on duplicate media
    surecart_api_token: ${{ secrets.SURECART_API_TOKEN }}
```

### Example: Explicit Warning Mode

```yaml
- name: Deploy to SureCart (Warning Mode)
  uses: Digital-Gravy/action-deploy-surecart@main
  with:
    media_uuid: ${{ inputs.media_uuid }}
    product_uuids: ${{ inputs.product_uuids }}
    set_as_current_release: true
    duplicate_media_behavior: warn  # Show warning, continue workflow
    surecart_api_token: ${{ secrets.SURECART_API_TOKEN }}
```

### Secrets

-   `SURECART_API_TOKEN`: You must add your SureCart API token as a secret in your repository's settings under `Settings` > `Secrets and variables` > `Actions`.

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

### Testing Locally

To run the tests locally, you'll need to install the `bats-core` test runner and clone the necessary helper libraries.

1.  **Install `bats-core`:**
    ```bash
    brew install bats-core
    ```

2.  **Clone Helper Libraries:**
    ```bash
    cd tests
    git clone https://github.com/bats-core/bats-support.git
    git clone https://github.com/bats-core/bats-assert.git
    cd .. 
    ```

3.  **Run the Tests:**
    ```bash
    bats tests
    ```

## Integration Testing

Integration tests verify the action works end-to-end with the real SureCart API using a comprehensive matrix strategy that tests all parameter combinations.

### Test Matrix Strategy

The integration tests use a **sequential matrix approach** to test all combinations of:
- **Products**: `single` vs `multiple` 
- **Current Release**: `true` vs `false`
- **Duplicate Behavior**: `warn` vs `error`

This ensures comprehensive coverage of all possible scenarios while running tests sequentially to avoid race conditions on the shared test product.

### Running Integration Tests

1. **Set up Repository Secrets:**
   - `SURECART_API_TOKEN`: Your SureCart API token

2. **Manual Testing:**
   - Go to the Actions tab in your GitHub repository
   - Select "Integration Tests" workflow
   - Click "Run workflow"
   - Choose test scope:
     - **`quick`**: Runs 3 key combinations (good for development)
     - **`full`**: Runs all 8 combinations (comprehensive validation)
     - **`error_handling`**: Tests error scenarios with invalid inputs

3. **Automatic Testing:**
   - **Push/PR**: Automatically runs `quick` scope (3 tests)
   - **Scheduled**: Runs `full` scope weekly (8 tests)

### Test Combinations

**Quick Scope (3 tests):**
- Single Product + Current Release + Warn
- Single Product + Current Release + Error  
- Multiple Products + No Current Release + Warn

**Full Scope (8 tests):**
- All combinations of `single`/`multiple` × `true`/`false` × `warn`/`error`

### Test Data
- **Product UUID**: `c995fb9c-70cc-4de2-b34f-6ce9d331705a`
- **Media UUID**: `8cc4a4e0-102b-4266-a81e-4aef9ff5713c`

### Key Features
- **Sequential Execution**: Tests run one at a time to avoid conflicts
- **Clean State**: Each test starts with a completely clean product state
- **Flexible Scoping**: Choose the right level of testing for your needs
- **Real API Calls**: End-to-end validation with actual SureCart API

**Note:** These tests make real API calls to SureCart, so use them judiciously.

## License

This project is licensed under the terms of the GPLv3 license.
