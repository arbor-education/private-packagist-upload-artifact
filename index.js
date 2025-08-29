const core = require('@actions/core');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
/**
 * Private Packagist Upload GitHub Action
 *
 * Mirrors the functionality of the PHP upload-artifact.php script
 * for uploading zip files to Private Packagist via their API.
 */

class PrivatePackagistUploader {
    constructor(apiKey, apiSecret, baseUrl = 'https://packagist.com') {
        if (!apiKey || !apiSecret) {
            throw new Error('API key and secret are required');
        }

        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.baseUrl = baseUrl;
        this.apiUrl = `${baseUrl}/api`;
    }

    /**
     * RFC3986 encoding to match PHP's http_build_query with PHP_QUERY_RFC3986
     * Mirrors the PHP normalizeParameters method
     *
     * This function properly handles binary data by encoding each byte individually
     */
    rfc3986Encode(str) {
        let result = '';
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const code = char.charCodeAt(0);

            // Unreserved characters (A-Z a-z 0-9 - . _ ~) are not encoded
            if ((code >= 65 && code <= 90) ||   // A-Z
                (code >= 97 && code <= 122) ||  // a-z
                (code >= 48 && code <= 57) ||   // 0-9
                code === 45 || code === 46 || code === 95 || code === 126) { // - . _ ~
                result += char;
            } else {
                // All other characters are percent-encoded
                result += '%' + code.toString(16).toUpperCase().padStart(2, '0');
            }
        }
        return result;
    }

    /**
     * Generate HMAC signature for request authentication
     * Mirrors the PHP RequestSignature::generateSignature method
     */
    generateSignature(method, host, path, params) {
        // Sort parameters by key (same as PHP uksort with strcmp)
        const sortedParams = Object.keys(params).sort().reduce((obj, key) => {
            obj[key] = params[key];
            return obj;
        }, {});

        // Build query string (RFC3986 encoding) to match PHP's http_build_query with PHP_QUERY_RFC3986
        const queryString = Object.keys(sortedParams)
            .map(key => `${this.rfc3986Encode(key)}=${this.rfc3986Encode(sortedParams[key])}`)
            .join('&');

        // Create signature data string
        const data = `${method}\n${host}\n${path}\n${queryString}`;

        // Generate HMAC-SHA256 signature
        const signature = crypto.createHmac('sha256', this.apiSecret)
            .update(data)
            .digest('base64');

        return signature;
    }

    /**
     * Generate authorization header
     * Mirrors the PHP RequestSignature::doHandleRequest method
     */
    generateAuthHeader(method, url, body = '') {
        const urlObj = new URL(url);
        const timestamp = Math.floor(Date.now() / 1000);
        const cnonce = crypto.randomBytes(20).toString('hex');

        const params = {
            key: this.apiKey,
            timestamp: timestamp.toString(),
            cnonce: cnonce
        };

        // Convert body to string like PHP does: $content = (string) $request->getBody();
        // For binary data (Buffer), use 'latin1' encoding to match PHP behavior
        if (body) {
            params.body = Buffer.isBuffer(body) ? body.toString('latin1') : body.toString();
        }

        const signature = this.generateSignature(method, urlObj.hostname, urlObj.pathname, params);

        return `PACKAGIST-HMAC-SHA256 Key=${this.apiKey}, Timestamp=${timestamp}, Cnonce=${cnonce}, Signature=${signature}`;
    }

    /**
     * Upload artifact to package
     * Mirrors the PHP Artifacts::add method
     */
    async uploadArtifact(packageName, fileBuffer, contentType, fileName) {
        const url = `${this.apiUrl}/packages/${packageName}/artifacts/`;
        const authHeader = this.generateAuthHeader('POST', url, fileBuffer);

        console.log('📤 Uploading artifact using API method...');
        console.log(`- Package: ${packageName}`);
        console.log(`- File: ${fileName}`);
        console.log(`- Size: ${fileBuffer.length} bytes`);
        console.log(`- Type: ${contentType}`);
        console.log('');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'Content-Type': contentType,
                'X-FILENAME': fileName,
                'User-Agent': 'node-private-packagist-api (https://github.com/arbor-education/gha.workflows)'
            },
            body: fileBuffer
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
    }

    /**
     * Get package information for verification
     * Mirrors the PHP Packages::show method
     */
    async getPackageInfo(packageName) {
        const url = `${this.apiUrl}/packages/${packageName}/`;
        const authHeader = this.generateAuthHeader('GET', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'node-private-packagist-api (https://github.com/arbor-education/gha.workflows)'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
    }
}

/**
 * Main execution function
 */
async function run() {
    try {
        console.log('Uploading artifact to Private Packagist via GitHub Actions');
        console.log('========================================================');
        console.log('');

        // Get inputs from GitHub Actions
        // API credentials should be provided as secrets via ${{ secrets.NAME }}
        const apiKey = core.getInput('api-key');
        const apiSecret = core.getInput('api-secret');
        const packageName = core.getInput('package-name');
        const filePath = core.getInput('file-path');
        const privatePackagistUrl = core.getInput('private-packagist-url') || 'https://packagist.com';

        // Validate required inputs
        if (!apiKey || !apiSecret) {
            console.log('❌ ERROR: Missing required API credentials.');
            console.log('Please ensure you have set up the following secrets in your repository:');
            console.log('- PACKAGIST_API_KEY');
            console.log('- PACKAGIST_API_SECRET');
            console.log('And pass them to the action as:');
            console.log('  api-key: ${{ secrets.PACKAGIST_API_KEY }}');
            console.log('  api-secret: ${{ secrets.PACKAGIST_API_SECRET }}');
            core.setFailed('Missing required API credentials');
            return;
        }

        if (!packageName) {
            const error = '❌ ERROR: package-name is required';
            console.log(error);
            core.setFailed(error);
            return;
        }

        if (!filePath) {
            const error = '❌ ERROR: file-path is required';
            console.log(error);
            core.setFailed(error);
            return;
        }

        console.log(`📦 Target Package: ${packageName}`);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            const error = `❌ ${filePath} not found. Please ensure the build process creates this file.`;
            console.log(error);
            core.setFailed(error);
            return;
        }

        const fileStats = fs.statSync(filePath);
        console.log(`📦 Found ${path.basename(filePath)} (${fileStats.size} bytes)`);
        console.log('');

        // Read file contents
        const fileBuffer = fs.readFileSync(filePath);

        if (!fileBuffer || fileBuffer.length === 0) {
            const error = '❌ Failed to read file contents';
            console.log(error);
            core.setFailed(error);
            return;
        }

        console.log(`✅ File contents loaded (${fileBuffer.length} bytes)`);

        // Create uploader instance
        const uploader = new PrivatePackagistUploader(apiKey, apiSecret, privatePackagistUrl);

        // Upload the artifact
        const result = await uploader.uploadArtifact(
            packageName,
            fileBuffer,
            'application/zip',
            path.basename(filePath)
        );

        console.log('🎉 SUCCESS! Artifact uploaded successfully!');
        console.log(`Response: ${JSON.stringify(result, null, 2)}`);
        console.log('');

        // Verify the upload and get package URL
        console.log('🔍 Verifying the upload...');
        let packageUrl = `${privatePackagistUrl}/packages/${packageName}`;
        try {
            const packageInfo = await uploader.getPackageInfo(packageName);
            console.log('✅ Package info retrieved:');
            console.log(`- Name: ${packageInfo.name || 'Unknown'}`);
            console.log(`- Type: ${packageInfo.config?.type || 'Unknown'}`);
            console.log(`- Artifact IDs: ${JSON.stringify(packageInfo.config?.artifactIds || [])}`);
            console.log(`- Web View: ${packageInfo.links?.webView || 'Unknown'}`);

            // Use the actual web view URL if available
            if (packageInfo.links?.webView) {
                packageUrl = packageInfo.links.webView;
            }
        } catch (error) {
            console.log(`⚠️  Could not retrieve package info: ${error.message}`);
        }

        console.log('');
        console.log('✅ UPLOAD COMPLETE!');
        console.log(`🌐 Package available at: ${packageUrl}`);
        console.log(`📦 To install: composer require ${packageName}`);

        // Set outputs for GitHub Actions
        core.setOutput('success', 'true');
        core.setOutput('package-name', packageName);
        core.setOutput('upload-result', JSON.stringify(result));
        core.setOutput('package-url', packageUrl);

    } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);

        if (error.stack) {
            console.log('');
            console.log('Stack trace:');
            console.log(error.stack);
        }

        core.setFailed(error.message);
    }
}

// Run the action
if (require.main === module) {
    run();
}

module.exports = { PrivatePackagistUploader, run };
