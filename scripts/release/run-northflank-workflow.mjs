// Legacy provider runner retained as an explicit fail-closed guard.
// Railway is the selected provider; this file intentionally makes no network requests.
console.error(
  "Disabled legacy Northflank release runner. No provider request was sent; production release remains blocked until Railway orchestration is verified.",
);
process.exitCode = 1;
