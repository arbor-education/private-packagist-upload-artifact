jest.mock('@actions/core');
jest.mock('node-fetch', () => jest.fn());

const core = require('@actions/core');
const fetch = require('node-fetch');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { run } = require('../index.js');

describe('run', () => {
    let inputs;
    let tmpDir;
    let consoleLogSpy;

    const writeTempFile = (name, contents) => {
        const filePath = path.join(tmpDir, name);
        fs.writeFileSync(filePath, contents);
        return filePath;
    };

    const validInputs = (filePath) => ({
        'api-key': 'test-key',
        'api-secret': 'test-secret',
        'package-name': 'vendor/package',
        'file-path': filePath
    });

    beforeAll(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'packagist-action-'));
    });

    afterAll(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    beforeEach(() => {
        jest.resetAllMocks();
        inputs = {};
        core.getInput.mockImplementation((name) => inputs[name] || '');
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
    });

    describe('input validation', () => {
        it('should fail when API credentials are missing', async () => {
            await run();

            expect(core.setFailed).toHaveBeenCalledWith('Missing required API credentials');
            expect(fetch).not.toHaveBeenCalled();
        });

        it('should fail when only the API key is provided', async () => {
            inputs = { 'api-key': 'test-key' };

            await run();

            expect(core.setFailed).toHaveBeenCalledWith('Missing required API credentials');
        });

        it('should fail when package-name is missing', async () => {
            inputs = { 'api-key': 'test-key', 'api-secret': 'test-secret' };

            await run();

            expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('package-name is required'));
            expect(fetch).not.toHaveBeenCalled();
        });

        it('should fail when file-path is missing', async () => {
            inputs = {
                'api-key': 'test-key',
                'api-secret': 'test-secret',
                'package-name': 'vendor/package'
            };

            await run();

            expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('file-path is required'));
            expect(fetch).not.toHaveBeenCalled();
        });

        it('should fail when the artifact file does not exist', async () => {
            inputs = validInputs(path.join(tmpDir, 'missing.zip'));

            await run();

            expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('not found'));
            expect(fetch).not.toHaveBeenCalled();
        });

        it('should fail when the artifact file is empty', async () => {
            inputs = validInputs(writeTempFile('empty.zip', ''));

            await run();

            expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Failed to read file contents'));
            expect(fetch).not.toHaveBeenCalled();
        });
    });

    describe('successful upload', () => {
        it('should upload the artifact and set outputs using the verified package URL', async () => {
            inputs = validInputs(writeTempFile('artifact.zip', 'zip contents'));
            const uploadResult = { id: 123 };
            const packageInfo = {
                name: 'vendor/package',
                config: { type: 'artifact', artifactIds: [123] },
                links: { webView: 'https://packagist.com/packages/vendor/package/web' }
            };
            fetch
                .mockResolvedValueOnce({ ok: true, json: async () => uploadResult })
                .mockResolvedValueOnce({ ok: true, json: async () => packageInfo });

            await run();

            expect(core.setFailed).not.toHaveBeenCalled();
            expect(fetch).toHaveBeenCalledTimes(2);
            expect(fetch.mock.calls[0][0]).toBe('https://packagist.com/api/packages/vendor/package/artifacts/');
            expect(core.setOutput).toHaveBeenCalledWith('success', 'true');
            expect(core.setOutput).toHaveBeenCalledWith('package-name', 'vendor/package');
            expect(core.setOutput).toHaveBeenCalledWith('upload-result', JSON.stringify(uploadResult));
            expect(core.setOutput).toHaveBeenCalledWith('package-url', packageInfo.links.webView);
        });

        it('should use a custom Private Packagist URL when provided', async () => {
            inputs = {
                ...validInputs(writeTempFile('artifact.zip', 'zip contents')),
                'private-packagist-url': 'https://custom.packagist.com'
            };
            fetch
                .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
                .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

            await run();

            expect(core.setFailed).not.toHaveBeenCalled();
            expect(fetch.mock.calls[0][0]).toBe('https://custom.packagist.com/api/packages/vendor/package/artifacts/');
            expect(core.setOutput).toHaveBeenCalledWith('package-url', 'https://custom.packagist.com/packages/vendor/package');
        });

        it('should fall back to the constructed package URL when package info has no web view link', async () => {
            inputs = validInputs(writeTempFile('artifact.zip', 'zip contents'));
            fetch
                .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1 }) })
                .mockResolvedValueOnce({ ok: true, json: async () => ({ name: 'vendor/package', config: {} }) });

            await run();

            expect(core.setFailed).not.toHaveBeenCalled();
            expect(core.setOutput).toHaveBeenCalledWith('package-url', 'https://packagist.com/packages/vendor/package');
        });

        it('should still succeed when post-upload verification fails', async () => {
            inputs = validInputs(writeTempFile('artifact.zip', 'zip contents'));
            fetch
                .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1 }) })
                .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'Server Error' });

            await run();

            expect(core.setFailed).not.toHaveBeenCalled();
            expect(core.setOutput).toHaveBeenCalledWith('success', 'true');
            expect(core.setOutput).toHaveBeenCalledWith('package-url', 'https://packagist.com/packages/vendor/package');
        });
    });

    describe('upload failure', () => {
        it('should fail the action when the upload request is rejected', async () => {
            inputs = validInputs(writeTempFile('artifact.zip', 'zip contents'));
            fetch.mockResolvedValueOnce({ ok: false, status: 403, text: async () => 'Invalid credentials' });

            await run();

            expect(core.setFailed).toHaveBeenCalledWith('HTTP 403: Invalid credentials');
            expect(core.setOutput).not.toHaveBeenCalled();
        });

        it('should fail the action on a network error', async () => {
            inputs = validInputs(writeTempFile('artifact.zip', 'zip contents'));
            fetch.mockRejectedValueOnce(new Error('socket hang up'));

            await run();

            expect(core.setFailed).toHaveBeenCalledWith('socket hang up');
        });

        it('should handle errors without a stack trace', async () => {
            inputs = validInputs(writeTempFile('artifact.zip', 'zip contents'));
            const error = new Error('boom');
            error.stack = '';
            fetch.mockRejectedValueOnce(error);

            await run();

            expect(core.setFailed).toHaveBeenCalledWith('boom');
        });
    });
});
