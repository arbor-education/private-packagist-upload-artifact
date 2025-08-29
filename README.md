# Private Packagist Upload Artifact Action

A GitHub Action to upload artifacts to Private Packagist repositories. This action is built in Node.js and provides the same functionality as the PHP-based upload script, allowing you to upload zip files to Private Packagist without needing PHP in your CI/CD pipeline.

## Features

- ✅ **Pure Node.js** - No PHP dependencies required
- 🔐 **HMAC Authentication** - Secure API authentication using HMAC-SHA256 signatures
- 📦 **Artifact Upload** - Upload zip files to Private Packagist packages
- 🔍 **Upload Verification** - Automatic verification of successful uploads
- 📊 **Detailed Logging** - Comprehensive logging with progress indicators
- 🔗 **Package URL Output** - Returns the URL of the uploaded package

## Usage

### Basic Usage

```yaml
- name: Upload to Private Packagist
  uses: arbor-education/gha.private-packagist-upload-artifact@main
  with:
    api-key: ${{ secrets.PACKAGIST_API_KEY }}
    api-secret: ${{ secrets.PACKAGIST_API_SECRET }}
    package-name: 'vendor/package-name'
    file-path: 'release.zip'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `api-key` | Private Packagist API key (**🔒 Use secrets only**: `${{ secrets.PACKAGIST_API_KEY }}`) | ✅ Yes | - |
| `api-secret` | Private Packagist API secret (**🔒 Use secrets only**: `${{ secrets.PACKAGIST_API_SECRET }}`) | ✅ Yes | - |
| `package-name` | Name of the package to upload to (format: `vendor/package-name`) | ✅ Yes | - |
| `file-path` | Path to the artifact file to upload | ✅ Yes | - |
| `private-packagist-url` | Private Packagist instance URL | ❌ No | `https://packagist.com` |

## Outputs

| Output | Description |
|--------|-------------|
| `success` | Whether the upload was successful (`true` or `false`) |
| `package-name` | The name of the package that was uploaded to |
| `upload-result` | JSON response from the upload API call |
| `package-url` | URL of the uploaded package |

## Authentication

### Getting API Credentials

⚠️ **Important**: This action requires an **API token**, not the standard authentication token used for composer authentication.

**To generate an API token:**

1. Log into your Private Packagist instance
2. Go to your profile settings
3. Navigate to the **"API Token"** section (not "Authentication Tokens")
4. Generate a new **API key and secret** pair
5. Store these as GitHub secrets:
   - `PACKAGIST_API_KEY`
   - `PACKAGIST_API_SECRET`

💡 **Note**: API tokens are used for programmatic access to upload artifacts, while authentication tokens are used for composer to download packages.

### Repository Initialization

⚠️ **Important**: For packages in **Artifact mode**, you must manually upload an initial release package with a valid `composer.json` file to bootstrap the repository before using this action.

1. Create a release package (ZIP file) containing your `composer.json`
2. Upload it manually through the Private Packagist web interface
3. Once the repository is initialized, you can use this action for subsequent uploads

💡 This initial upload establishes the package structure and metadata that Private Packagist needs for artifact-based packages.

### Security Notes

- ⚠️ **Never commit API credentials to your repository**
- ✅ Always use GitHub secrets for sensitive information
- 🔒 The action uses HMAC-SHA256 signatures for secure authentication
- 🛡️ API credentials are handled securely and not logged

## Error Handling

The action provides detailed error messages for common issues:

- **Missing credentials**: Clear indication of which credentials are missing
- **File not found**: Helpful message when the specified file doesn't exist
- **API errors**: HTTP status codes and response details from the API
- **Upload verification**: Warnings if package verification fails

## Requirements

- **Node.js**: 18 or higher (action runs on Node.js 20)
- **GitHub Runner**: ubuntu-latest, windows-latest, or macos-latest
- **File format**: Currently supports ZIP files (application/zip)

## Troubleshooting

### Common Issues

1. **"Missing required API credentials"**
   - Ensure you've set the GitHub secrets correctly
   - Verify the secret names match exactly

2. **"File not found"**
   - Check the file path is correct relative to the workspace
   - Ensure your build step creates the file before upload

3. **"HTTP 401: Unauthorized"**
   - Verify your API credentials are correct
   - Check if your API key has the necessary permissions
   - **Important**: Ensure you're using **API tokens** (not authentication tokens) - see [Getting API Credentials](#getting-api-credentials)

4. **"HTTP 404: Not Found"**
   - Verify the package name format is correct (`vendor/package-name`)
   - Ensure the package exists in your Private Packagist instance
   - For Artifact mode packages: Make sure you've completed the [Repository Initialization](#repository-initialization) steps

5. **"Package not found" or similar errors**
   - This often indicates the repository hasn't been initialized yet
   - See [Repository Initialization](#repository-initialization) for required setup steps

### Debug Mode

Enable debug logging by setting the runner in debug mode:

```yaml
- name: Enable debug mode
  run: echo "ACTIONS_STEP_DEBUG=true" >> $GITHUB_ENV
```

## Development

### Automated Build Process

This action uses an automated build process:

- **Source code**: `index.js` (what contributors work on)
- **Distribution**: `dist/index.js` (automatically built and committed during releases)
- **No manual builds**: Contributors don't need to build or commit `dist/`

The `dist/` directory is automatically generated and committed when code is pushed to `main`, ensuring the action always has an up-to-date compiled version.

### GitHub Actions Marketplace

To publish this action to the GitHub Actions Marketplace:

1. **Automated Release**: Push to `main` to trigger automatic release creation
2. **Manual Publishing**: Visit the release page and click "Publish this Action to the GitHub Marketplace"
3. **Marketplace Benefits**: Publishing to the marketplace makes the action discoverable and easier to use for the community

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development

1. Clone the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Run linting (`npm run lint`)
6. Commit your changes (`git commit -m 'Add some amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint the code
npm run lint
```

## License

MIT License - see the [LICENSE](LICENSE) file for details.

Copyright © 2025 Arbor Education
