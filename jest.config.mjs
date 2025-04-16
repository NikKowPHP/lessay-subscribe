export default {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  // Make sure Jest transforms .mjs as well by adding it to the regex
  transform: {
    '^.+\\.(js|jsx|ts|tsx|mjs)$': [
      'babel-jest',
      { configFile: './babel.test.babelrc' }
    ]
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  // Updated transformIgnorePatterns to include "node-fetch" in the exception
  transformIgnorePatterns: [
    '/node_modules/(?!(posthog-js|node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill|lucide-react)/)'
  ],
  // This tells Jest to treat these extensions as ESM files
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};