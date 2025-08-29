const fs = require('fs');

describe('Action Integration', () => {
    describe('Module Loading', () => {
        it('should load the main module without errors', () => {
            expect(() => {
                require('../index.js');
            }).not.toThrow();
        });

        it('should export expected functions', () => {
            const { PrivatePackagistUploader, run } = require('../index.js');

            expect(PrivatePackagistUploader).toBeDefined();
            expect(typeof PrivatePackagistUploader).toBe('function');
            expect(run).toBeDefined();
            expect(typeof run).toBe('function');
        });
    });

    describe('Action Metadata', () => {
        it('should have valid action.yml file', () => {
            expect(fs.existsSync('action.yml')).toBe(true);
        });

        it('should have required inputs in action.yml', () => {
            const actionContent = fs.readFileSync('action.yml', 'utf8');

            expect(actionContent).toContain('api-key:');
            expect(actionContent).toContain('api-secret:');
            expect(actionContent).toContain('package-name:');
            expect(actionContent).toContain('file-path:');
        });

        it('should have expected outputs in action.yml', () => {
            const actionContent = fs.readFileSync('action.yml', 'utf8');

            expect(actionContent).toContain('success:');
            expect(actionContent).toContain('package-name:');
            expect(actionContent).toContain('upload-result:');
            expect(actionContent).toContain('package-url:');
        });
    });

    describe('Package Configuration', () => {
        let packageJson;

        beforeAll(() => {
            packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        });

        it('should have required package.json fields', () => {
            const requiredFields = ['name', 'version', 'description', 'main', 'dependencies'];

            for (const field of requiredFields) {
                expect(packageJson[field]).toBeDefined();
                expect(packageJson[field]).not.toBe('');
            }
        });

        it('should have required dependencies', () => {
            const requiredDeps = ['@actions/core', 'node-fetch'];

            for (const dep of requiredDeps) {
                expect(packageJson.dependencies[dep]).toBeDefined();
            }
        });

        it('should have correct main entry point', () => {
            expect(packageJson.main).toBe('index.js');
            expect(fs.existsSync(packageJson.main)).toBe(true);
        });

        it('should have Node.js engine requirement', () => {
            expect(packageJson.engines).toBeDefined();
            expect(packageJson.engines.node).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should validate input parameters exist', () => {
            // Test that the run function exists and can be called
            // More complex mocking would be needed for full integration testing
            const { run } = require('../index.js');
            expect(typeof run).toBe('function');
        });
    });

    describe('File Structure', () => {
        it('should have essential files present', () => {
            const essentialFiles = [
                'index.js',
                'action.yml',
                'package.json',
                'README.md',
                '.gitignore'
            ];

            for (const file of essentialFiles) {
                expect(fs.existsSync(file)).toBe(true);
            }
        });

        it('should have GitHub workflows directory', () => {
            expect(fs.existsSync('.github/workflows')).toBe(true);
            expect(fs.lstatSync('.github/workflows').isDirectory()).toBe(true);
        });

        it('should have test directory', () => {
            expect(fs.existsSync('test')).toBe(true);
            expect(fs.lstatSync('test').isDirectory()).toBe(true);
        });
    });
});
