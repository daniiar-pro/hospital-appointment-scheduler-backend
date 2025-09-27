import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  testMatch: ["**/*.spec.ts"],
  transform: { "^.+\\.tsx?$": ["ts-jest", { useESM: true, tsconfig: "tsconfig.json" }] },
  extensionsToTreatAsEsm: [".ts"],
  moduleFileExtensions: ["ts", "tsx", "js"],

  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  testPathIgnorePatterns:["<rootDir>/dist/"],

  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.ts",
    "src/**/*/app.ts",
    "src/**/*/logger.ts",
    "src/**/*/smoke.ts",
    "!src/**/types.ts",
    "!src/**/config.ts",
    "!src/**/index.ts",
    "!src/entities/**",
    "!src/database/migrate/**",
    "!src/database/create-db.ts",
    "!src/database/drop-db.ts",
    "!src/database/seed-admin.ts",
    "!src/docs/**",
  ],
  coverageThreshold: {
    global: { branches: 50, functions: 55, lines: 60, statements: 60 },
  },
};

export default config;
