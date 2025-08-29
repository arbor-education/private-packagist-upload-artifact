# Contributing to Private Packagist Upload Action

## Development

### Prerequisites

- Node.js 18 or higher
- npm

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Testing Locally

The project uses Jest for testing with npm scripts:

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run linting (syntax check)
npm run lint

# Run full validation (lint + test)
npm run validate

# Build the distribution (for local testing only)
npm run build

# Full package process (clean, validate, build)
npm run package
```

### Test Structure

Tests are organized in the `test/` directory:

- `test/uploader.test.js` - Unit tests for the `PrivatePackagistUploader` class
- `test/action.test.js` - Integration tests for action metadata, file structure, and module loading

### Writing Tests

When adding new functionality:

1. **Unit Tests**: Add tests in `test/uploader.test.js` for new methods or functionality
2. **Integration Tests**: Add tests in `test/action.test.js` for file structure or configuration changes
3. **Test Coverage**: Aim for good test coverage of critical functionality like encoding and signature generation

### Running CI Tests Locally

The CI workflow runs the same commands you can run locally:

```bash
# Install dependencies (same as CI)
npm ci

# Run the same validation as CI
npm run validate
```

## Releasing

### Version Tagging

The repository uses semantic versioning with the format `v1.2.3`.

1. **Automated Releases**: Releases are handled by the `tag-release.yml` workflow when code is pushed to `main`

### Manual Release Process

If you need to create a manual release:

1. Update the version in `package.json`
2. Commit the version change
3. Create and push a tag:
   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```
4. The workflows will handle creating the GitHub release and updating major version tags

## Architecture

### Key Components

- **`index.js`**: Main action implementation
- **`action.yml`**: GitHub Action metadata
- **`package.json`**: Node.js dependencies and metadata

### Dependencies

- **`@actions/core`**: GitHub Actions SDK for inputs/outputs
- **`node-fetch`**: HTTP client for API requests
- **`strict-uri-encode`**: RFC3986 compliant URL encoding

### RFC3986 Encoding

The action uses `strict-uri-encode` to ensure proper RFC3986 encoding that matches PHP's `http_build_query` with `PHP_QUERY_RFC3986`. This is crucial for signature generation compatibility.

### Build Process

GitHub Actions require a compiled distribution:

- **Source**: `index.js` (development version with dependencies)
- **Distribution**: `dist/index.js` (compiled/bundled version - generated automatically)
- **Tool**: `@vercel/ncc` bundles the action and all dependencies into a single file
- **Action runs**: `dist/index.js` (specified in `action.yml`)

✨ **Automated**: The `dist/` directory is automatically built and committed during the release process. Contributors don't need to build or commit it manually.

## Testing with Private Packagist

⚠️ **Note**: Testing with real Private Packagist credentials should only be done in controlled environments with test packages, never in CI/CD.

For local testing with real API credentials:

1. Set up environment variables:
   ```bash
   export INPUT_API-KEY="your-api-key"
   export INPUT_API-SECRET="your-api-secret"
   export INPUT_PACKAGE-NAME="test/package"
   export INPUT_FILE-PATH="test.zip"
   ```

2. Create a test zip file:
   ```bash
   echo "test" > test.txt
   zip test.zip test.txt
   ```

3. Run the action:
   ```bash
   node index.js
   ```

## Code Style

- Use clear, descriptive variable names
- Add comments for complex logic
- Follow existing patterns in the codebase
- Maintain compatibility with PHP signature generation

## Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally using the steps above
5. Submit a pull request with a clear description

The CI workflow will automatically test your changes when you open a PR.
