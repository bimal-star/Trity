module.exports = {
  // Run ESLint check (no auto-fix) on TypeScript and JavaScript files
  '*.{js,jsx,ts,tsx}': ['eslint'],
  // Run Prettier check (no auto-format) on all supported files
  '*.{js,jsx,ts,tsx,json,css,md,mdx,yml,yaml}': ['prettier --check'],
};
