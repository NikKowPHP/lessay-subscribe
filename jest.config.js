module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      { configFile: './babel.test.babelrc' }
    ]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(posthog-js)/)'
  ]
};