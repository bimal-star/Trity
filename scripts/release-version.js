#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const packageLockPath = path.join(rootDir, 'package-lock.json');
const changelogPath = path.join(rootDir, 'CHANGELOG.md');

const bumpType = process.argv[2] || 'patch';
const dryRun = process.argv.includes('--dry-run');
const shouldCommit = process.argv.includes('--commit');
const shouldTag = process.argv.includes('--tag');
const supportedBumps = new Set(['patch', 'minor', 'major']);

function run(command) {
  return execSync(command, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function runStreaming(command) {
  execSync(command, {
    cwd: rootDir,
    stdio: 'inherit',
  });
}

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Unsupported version format "${version}". Expected x.y.z`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function incrementVersion(current, type) {
  const v = parseVersion(current);
  if (type === 'patch') return `${v.major}.${v.minor}.${v.patch + 1}`;
  if (type === 'minor') return `${v.major}.${v.minor + 1}.0`;
  return `${v.major + 1}.0.0`;
}

function bucketCommit(subject) {
  const normalized = subject.toLowerCase();
  if (normalized.startsWith('feat')) return 'Features';
  if (normalized.startsWith('fix')) return 'Fixes';
  if (normalized.startsWith('perf')) return 'Performance';
  if (normalized.startsWith('refactor')) return 'Refactoring';
  if (normalized.startsWith('docs')) return 'Documentation';
  if (normalized.startsWith('test')) return 'Tests';
  if (
    normalized.startsWith('build') ||
    normalized.startsWith('chore') ||
    normalized.startsWith('ci')
  )
    return 'Build & Chore';
  return 'Other';
}

function getLastVersionTag() {
  const tagsRaw = run('git tag --sort=-v:refname');
  if (!tagsRaw) return null;

  const tag = tagsRaw
    .split('\n')
    .map((s) => s.trim())
    .find((t) => /^v?\d+\.\d+\.\d+$/.test(t));

  return tag || null;
}

function getCommitSubjectsSince(ref) {
  const range = ref ? `${ref}..HEAD` : 'HEAD';
  const commitsRaw = run(`git log --pretty=format:%s ${range}`);
  if (!commitsRaw) return [];

  return commitsRaw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !s.startsWith('Merge '));
}

function buildChangelogEntry(nextVersion, previousRef, commits) {
  const date = new Date().toISOString().slice(0, 10);
  const grouped = new Map();

  for (const subject of commits) {
    const group = bucketCommit(subject);
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group).push(subject);
  }

  const orderedGroups = [
    'Features',
    'Fixes',
    'Performance',
    'Refactoring',
    'Documentation',
    'Tests',
    'Build & Chore',
    'Other',
  ];

  const lines = [`## ${nextVersion} - ${date}`, ''];
  if (previousRef) {
    lines.push(`Based on commits since \`${previousRef}\`.`, '');
  } else {
    lines.push('Initial recorded release notes from existing history.', '');
  }

  if (commits.length === 0) {
    lines.push('- No commit subjects found for this release window.', '');
    return lines.join('\n');
  }

  for (const group of orderedGroups) {
    const entries = grouped.get(group);
    if (!entries || entries.length === 0) continue;
    lines.push(`### ${group}`);
    for (const entry of entries) {
      lines.push(`- ${entry}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function updateVersions(nextVersion) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  pkg.version = nextVersion;
  writeJson(packageJsonPath, pkg);

  if (fs.existsSync(packageLockPath)) {
    const lock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
    lock.version = nextVersion;
    if (lock.packages && lock.packages['']) {
      lock.packages[''].version = nextVersion;
    }
    writeJson(packageLockPath, lock);
  }
}

function updateChangelog(nextVersion, lastTag, commits) {
  const header = '# Changelog\n\nAll notable project changes are recorded here.\n\n';
  const entry = buildChangelogEntry(nextVersion, lastTag, commits);
  const existing = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf8') : '';

  if (existing.includes(`## ${nextVersion} - `)) {
    throw new Error(`CHANGELOG already contains version ${nextVersion}.`);
  }

  let content = `${header}${entry}\n`;
  if (existing.startsWith('# Changelog')) {
    const withoutHeader = existing
      .replace(/^# Changelog\s*\n\s*All notable project changes are recorded here\.\s*\n*/m, '')
      .trimStart();
    content = `${header}${entry}${withoutHeader ? `\n${withoutHeader}` : ''}`;
  }

  fs.writeFileSync(changelogPath, content, 'utf8');
}

function ensureCleanWorktree() {
  const status = run('git status --porcelain');
  if (status) {
    throw new Error(
      'Cannot auto-commit/tag with a dirty worktree. Commit or stash pending changes first.'
    );
  }
}

function createReleaseCommitAndTag(nextVersion) {
  const message = `chore(release): v${nextVersion}`;
  runStreaming('git add package.json package-lock.json CHANGELOG.md');
  runStreaming(`git commit -m "${message}"`);
  runStreaming(`git tag v${nextVersion}`);
}

function main() {
  if (!supportedBumps.has(bumpType)) {
    console.error(
      'Usage: node scripts/release-version.js [patch|minor|major] [--dry-run] [--commit] [--tag]'
    );
    process.exit(1);
  }
  if (shouldTag && !shouldCommit) {
    console.error('`--tag` requires `--commit` to ensure tag points to release commit.');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = pkg.version;
  const nextVersion = incrementVersion(currentVersion, bumpType);
  const lastTag = getLastVersionTag();
  const commits = getCommitSubjectsSince(lastTag);

  if (!dryRun && (shouldCommit || shouldTag)) {
    ensureCleanWorktree();
  }

  if (!dryRun) {
    updateVersions(nextVersion);
    updateChangelog(nextVersion, lastTag, commits);
    if (shouldCommit || shouldTag) {
      createReleaseCommitAndTag(nextVersion);
    }
  }

  console.log(
    dryRun
      ? `[dry-run] Planned version bump: ${currentVersion} -> ${nextVersion}`
      : `Version bumped: ${currentVersion} -> ${nextVersion}`
  );
  console.log(
    dryRun
      ? `[dry-run] Planned changelog update at ${path.relative(rootDir, changelogPath)}`
      : `Changelog updated at ${path.relative(rootDir, changelogPath)}`
  );
  if (lastTag) {
    console.log(`Collected commit subjects since tag ${lastTag}`);
  } else {
    console.log('No version tags found; collected history from repository commits');
  }
  console.log('Next: review CHANGELOG, then commit and create tag v' + nextVersion);
  if (shouldCommit || shouldTag) {
    console.log(
      dryRun
        ? '[dry-run] Would auto-create release commit and version tag'
        : 'Release commit and tag created automatically'
    );
  }
}

main();
