jest.mock('node-fetch', () => jest.fn());

const fetch = require('node-fetch');
const { PrivatePackagistUploader } = require('../index.js');

describe('PrivatePackagistUploader API calls', () => {
    let uploader;
    let consoleLogSpy;

    beforeEach(() => {
        fetch.mockReset();
        uploader = new PrivatePackagistUploader('test-key', 'test-secret');
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
    });

    describe('uploadArtifact', () => {
        const fileBuffer = Buffer.from('zip file contents');

        it('should POST the artifact with auth and metadata headers', async () => {
            const apiResult = { id: 123 };
            fetch.mockResolvedValue({ ok: true, json: async () => apiResult });

            const result = await uploader.uploadArtifact('vendor/package', fileBuffer, 'application/zip', 'artifact.zip');

            expect(result).toEqual(apiResult);
            expect(fetch).toHaveBeenCalledTimes(1);

            const [url, options] = fetch.mock.calls[0];
            expect(url).toBe('https://packagist.com/api/packages/vendor/package/artifacts/');
            expect(options.method).toBe('POST');
            expect(options.body).toBe(fileBuffer);
            expect(options.headers['Authorization']).toMatch(/^PACKAGIST-HMAC-SHA256 /);
            expect(options.headers['Content-Type']).toBe('application/zip');
            expect(options.headers['X-FILENAME']).toBe('artifact.zip');
            expect(options.headers['Accept']).toBe('application/json');
        });

        it('should throw with status and response body on a failed upload', async () => {
            fetch.mockResolvedValue({ ok: false, status: 403, text: async () => 'Invalid credentials' });

            await expect(
                uploader.uploadArtifact('vendor/package', fileBuffer, 'application/zip', 'artifact.zip')
            ).rejects.toThrow('HTTP 403: Invalid credentials');
        });

        it('should propagate network errors', async () => {
            fetch.mockRejectedValue(new Error('socket hang up'));

            await expect(
                uploader.uploadArtifact('vendor/package', fileBuffer, 'application/zip', 'artifact.zip')
            ).rejects.toThrow('socket hang up');
        });

        it('should use a custom Private Packagist base URL', async () => {
            const customUploader = new PrivatePackagistUploader('key', 'secret', 'https://custom.packagist.com');
            fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

            await customUploader.uploadArtifact('vendor/package', fileBuffer, 'application/zip', 'artifact.zip');

            const [url] = fetch.mock.calls[0];
            expect(url).toBe('https://custom.packagist.com/api/packages/vendor/package/artifacts/');
        });
    });

    describe('getPackageInfo', () => {
        it('should GET package info with auth header', async () => {
            const packageInfo = { name: 'vendor/package' };
            fetch.mockResolvedValue({ ok: true, json: async () => packageInfo });

            const result = await uploader.getPackageInfo('vendor/package');

            expect(result).toEqual(packageInfo);
            expect(fetch).toHaveBeenCalledTimes(1);

            const [url, options] = fetch.mock.calls[0];
            expect(url).toBe('https://packagist.com/api/packages/vendor/package/');
            expect(options.method).toBe('GET');
            expect(options.headers['Authorization']).toMatch(/^PACKAGIST-HMAC-SHA256 /);
            expect(options.headers['Accept']).toBe('application/json');
        });

        it('should throw with status and response body when the lookup fails', async () => {
            fetch.mockResolvedValue({ ok: false, status: 404, text: async () => 'Not found' });

            await expect(uploader.getPackageInfo('vendor/missing')).rejects.toThrow('HTTP 404: Not found');
        });
    });
});
