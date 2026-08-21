/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const packageJsonPath = path.join(root, "package.json");
const packageLockPath = path.join(root, "package-lock.json");
const changelogPath = path.join(root, "CHANGELOG.md");

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const packageLock = JSON.parse(fs.readFileSync(packageLockPath, "utf8"));
const changelog = fs.readFileSync(changelogPath, "utf8");

const version = packageJson.version;
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;
const errors = [];

if (!semverPattern.test(version)) {
  errors.push(`package.json version "${version}" is not a valid semver version.`);
}

if (packageLock.version !== version) {
  errors.push(`package-lock.json version "${packageLock.version}" does not match package.json "${version}".`);
}

if (packageLock.packages?.[""]?.version !== version) {
  errors.push(
    `package-lock.json root package version "${packageLock.packages?.[""]?.version}" does not match package.json "${version}".`
  );
}

if (!changelog.includes(`## [${version}]`)) {
  errors.push(`CHANGELOG.md is missing an entry for version ${version}.`);
}

if (errors.length > 0) {
  console.error("Version tracking check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Version tracking check passed for ${version}.`);
