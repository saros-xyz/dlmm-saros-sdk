module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/'],
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
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
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
