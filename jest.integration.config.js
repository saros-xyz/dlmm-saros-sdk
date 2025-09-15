module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/'],
    testMatch: ['**/?(*.)+(spec|test).ts'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    collectCoverageFrom: [
        'services/**/*.ts',
        'utils/**/*.ts',
        'constants/**/*.ts',
        'types/**/*.ts',
        '!**/*.d.ts',
    ],
    // No setup file for integration tests - use real implementations
    // setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

    // Handle open handles and async operations
    forceExit: true,
    detectOpenHandles: true,
    testTimeout: 300000, // 5 minutes global timeout
};
