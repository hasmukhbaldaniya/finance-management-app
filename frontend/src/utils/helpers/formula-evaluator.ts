// Safe arithmetic evaluator for a CategoryField's config.formula (e.g.
// "{{Nights}} * {{RatePerNight}}") — no eval()/new Function() per this
// codebase's security rules. Kept in sync by hand with the backend's own
// copy (backend/src/utils/formula-evaluator.ts); this one exists so the
// claim form can show a formula-computed field's live value without a
// round trip on every keystroke — the backend still recomputes and is
// authoritative at save time.

function evaluateExpression(expr: string): number | null {
  let pos = 0;

  function peek(): string | undefined {
    return expr[pos];
  }
  function isDigit(ch: string | undefined): boolean {
    return ch !== undefined && ch >= "0" && ch <= "9";
  }
  function skipSpace(): void {
    while (peek() === " ") pos++;
  }
  function parseNumber(): number {
    skipSpace();
    const start = pos;
    while (isDigit(peek()) || peek() === ".") pos++;
    if (pos === start) throw new Error("expected number");
    return Number(expr.slice(start, pos));
  }
  function parseFactor(): number {
    skipSpace();
    if (peek() === "(") {
      pos++;
      const value = parseExpression();
      skipSpace();
      if (peek() !== ")") throw new Error("expected )");
      pos++;
      return value;
    }
    if (peek() === "-") {
      pos++;
      return -parseFactor();
    }
    return parseNumber();
  }
  function parseTerm(): number {
    let value = parseFactor();
    for (;;) {
      skipSpace();
      const op = peek();
      if (op === "*" || op === "/") {
        pos++;
        const rhs = parseFactor();
        value = op === "*" ? value * rhs : value / rhs;
      } else {
        break;
      }
    }
    return value;
  }
  function parseExpression(): number {
    let value = parseTerm();
    for (;;) {
      skipSpace();
      const op = peek();
      if (op === "+" || op === "-") {
        pos++;
        const rhs = parseTerm();
        value = op === "+" ? value + rhs : value - rhs;
      } else {
        break;
      }
    }
    return value;
  }

  try {
    const result = parseExpression();
    skipSpace();
    if (pos !== expr.length) return null;
    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

export function evaluateFormula(formula: string, values: Record<string, number>): number | null {
  let expr = formula;
  for (const [name, value] of Object.entries(values)) {
    expr = expr.split(`{{${name}}}`).join(`(${value})`);
  }
  if (/\{\{[^}]+\}\}/.test(expr)) return null;
  if (!/^[\d\s+\-*/().]+$/.test(expr)) return null;
  return evaluateExpression(expr);
}
