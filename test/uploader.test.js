const { PrivatePackagistUploader } = require('../index.js');
const crypto = require('crypto');

describe('PrivatePackagistUploader', () => {
    let uploader;

    beforeEach(() => {
        uploader = new PrivatePackagistUploader('test-key', 'test-secret', 'https://packagist.com');
    });

    describe('constructor', () => {
        it('should create uploader with valid credentials', () => {
            expect(uploader.apiKey).toBe('test-key');
            expect(uploader.apiSecret).toBe('test-secret');
            expect(uploader.baseUrl).toBe('https://packagist.com');
            expect(uploader.apiUrl).toBe('https://packagist.com/api');
        });

        it('should throw error with missing API key', () => {
            expect(() => {
                new PrivatePackagistUploader('', 'test-secret');
            }).toThrow('API key and secret are required');
        });

        it('should throw error with missing API secret', () => {
            expect(() => {
                new PrivatePackagistUploader('test-key', '');
            }).toThrow('API key and secret are required');
        });

        it('should use default base URL when not provided', () => {
            const defaultUploader = new PrivatePackagistUploader('key', 'secret');
            expect(defaultUploader.baseUrl).toBe('https://packagist.com');
        });
    });

    describe('rfc3986Encode', () => {
        it('should encode binary data correctly', () => {
            const binaryData = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00]);
            const binaryString = binaryData.toString('latin1');
            const result = uploader.rfc3986Encode(binaryString);

            expect(result).toBe('PK%03%04%14%00%00%00%08%00');
        });

        it('should encode special characters correctly', () => {
            const input = 'test!*()\'data';
            const result = uploader.rfc3986Encode(input);

            expect(result).toBe('test%21%2A%28%29%27data');
        });

        it('should not encode unreserved characters', () => {
            const input = 'ABCabc123-._~';
            const result = uploader.rfc3986Encode(input);

            expect(result).toBe('ABCabc123-._~');
        });

        it('should encode spaces correctly', () => {
            const input = 'hello world';
            const result = uploader.rfc3986Encode(input);

            expect(result).toBe('hello%20world');
        });

        it('should encode all reserved characters', () => {
            const input = ':/?#[]@!$&\'()*+,;=';
            const result = uploader.rfc3986Encode(input);

            expect(result).toBe('%3A%2F%3F%23%5B%5D%40%21%24%26%27%28%29%2A%2B%2C%3B%3D');
        });
    });

    describe('generateSignature', () => {
        it('should generate consistent signatures', () => {
            const params = {
                key: 'test-key',
                timestamp: '1234567890',
                cnonce: 'test-cnonce',
                body: 'test-body'
            };

            const signature1 = uploader.generateSignature('POST', 'packagist.com', '/api/packages/test/artifacts/', params);
            const signature2 = uploader.generateSignature('POST', 'packagist.com', '/api/packages/test/artifacts/', params);

            expect(signature1).toBe(signature2);
            expect(signature1).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 format
        });

        it('should sort parameters by key', () => {
            const params = {
                z_last: 'value',
                a_first: 'value',
                m_middle: 'value'
            };

            // Mock the crypto functions to verify the data string
            const originalCreateHmac = crypto.createHmac;
            let capturedData = '';

            crypto.createHmac = jest.fn().mockReturnValue({
                update: jest.fn().mockImplementation((data) => {
                    capturedData = data;
                    return {
                        digest: jest.fn().mockReturnValue('mock-signature')
                    };
                })
            });

            uploader.generateSignature('POST', 'example.com', '/path', params);

            // Verify parameters are sorted alphabetically in the query string
            expect(capturedData).toContain('a_first=value&m_middle=value&z_last=value');

            // Restore original function
            crypto.createHmac = originalCreateHmac;
        });

        it('should include method, host, path, and query string in signature data', () => {
            const params = { test: 'value' };

            const originalCreateHmac = crypto.createHmac;
            let capturedData = '';

            crypto.createHmac = jest.fn().mockReturnValue({
                update: jest.fn().mockImplementation((data) => {
                    capturedData = data;
                    return {
                        digest: jest.fn().mockReturnValue('mock-signature')
                    };
                })
            });

            uploader.generateSignature('POST', 'example.com', '/test/path', params);

            const expectedData = 'POST\nexample.com\n/test/path\ntest=value';
            expect(capturedData).toBe(expectedData);

            crypto.createHmac = originalCreateHmac;
        });
    });

    describe('generateAuthHeader', () => {
        beforeEach(() => {
            // Mock Date.now and crypto.randomBytes for consistent testing
            jest.spyOn(Date, 'now').mockReturnValue(1234567890000); // Fixed timestamp
            jest.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('1234567890abcdef1234567890abcdef12345678', 'hex'));
        });

        afterEach(() => {
            Date.now.mockRestore();
            crypto.randomBytes.mockRestore();
        });

        it('should generate auth header with correct format', () => {
            const url = 'https://packagist.com/api/packages/test/artifacts/';
            const authHeader = uploader.generateAuthHeader('POST', url);

            expect(authHeader).toMatch(/^PACKAGIST-HMAC-SHA256 Key=test-key, Timestamp=\d+, Cnonce=[a-f0-9]+, Signature=.+$/);
        });

        it('should include body in signature when provided', () => {
            const url = 'https://packagist.com/api/packages/test/artifacts/';
            const body = Buffer.from('test body content');

            const authHeader1 = uploader.generateAuthHeader('POST', url);
            const authHeader2 = uploader.generateAuthHeader('POST', url, body);

            // Headers should be different when body is included
            expect(authHeader1).not.toBe(authHeader2);
        });

        it('should handle Buffer body correctly', () => {
            const url = 'https://packagist.com/api/packages/test/artifacts/';
            const body = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

            const authHeader = uploader.generateAuthHeader('POST', url, body);

            expect(authHeader).toMatch(/^PACKAGIST-HMAC-SHA256/);
        });

        it('should handle string body correctly', () => {
            const url = 'https://packagist.com/api/packages/test/artifacts/';
            const body = 'string body content';

            const authHeader = uploader.generateAuthHeader('POST', url, body);

            expect(authHeader).toMatch(/^PACKAGIST-HMAC-SHA256/);
        });
    });
});
