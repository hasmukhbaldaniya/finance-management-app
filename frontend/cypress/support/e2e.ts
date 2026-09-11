import "./commands";

// Next.js dev mode + MUI/Emotion's SSR style insertion occasionally race,
// producing a "Hydration failed" console error that React itself recovers
// from by regenerating the tree client-side (the warning says so directly)
// — but Cypress's default uncaught:exception handling fails the test
// anyway. Only this specific, known, self-healing warning is swallowed;
// every other uncaught exception still fails tests normally.
Cypress.on("uncaught:exception", (err) => {
  if (err.message.includes("Hydration failed because the server rendered HTML didn't match the client")) {
    return false;
  }
  return true;
});
