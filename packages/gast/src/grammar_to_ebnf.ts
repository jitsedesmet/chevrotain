import {
  Alternation,
  Alternative,
  NonTerminal,
  Option,
  Repetition,
  RepetitionMandatory,
  RepetitionMandatoryWithSeparator,
  RepetitionWithSeparator,
  Rule,
  Terminal,
} from "./model.js";
import type { IProduction, TokenType } from "@chevrotain/types";

function tokenLabel(tokType: TokenType): string {
  if (typeof tokType.LABEL === "string" && tokType.LABEL !== "") {
    return tokType.LABEL;
  }
  return tokType.name;
}

function tokenPatternToEbnf(tokenType: TokenType): string {
  const pattern = tokenType.PATTERN;
  if (pattern === undefined || pattern === null) {
    return "/* no pattern */";
  }
  if (typeof pattern === "function") {
    return "/* custom token */";
  }
  if (pattern instanceof RegExp) {
    const flags = pattern.flags;
    return flags ? `/${pattern.source}/${flags}` : `/${pattern.source}/`;
  }
  // string literal pattern
  return `"${pattern}"`;
}

function renderProduction(
  prod: IProduction,
  collectedTerminals: Map<string, TokenType>,
): string {
  if (prod instanceof Terminal) {
    const tokenType = prod.terminalType;
    collectedTerminals.set(tokenType.name, tokenType);
    return tokenLabel(tokenType);
  } else if (prod instanceof NonTerminal) {
    return prod.nonTerminalName;
  } else if (prod instanceof Rule) {
    const body = prod.definition
      .map((p) => renderProduction(p, collectedTerminals))
      .join(" ");
    return `${prod.name} ::= ${body}`;
  } else if (prod instanceof Option) {
    const inner = prod.definition
      .map((p) => renderProduction(p, collectedTerminals))
      .join(" ");
    return prod.definition.length === 1 ? `${inner}?` : `( ${inner} )?`;
  } else if (prod instanceof Repetition) {
    const inner = prod.definition
      .map((p) => renderProduction(p, collectedTerminals))
      .join(" ");
    return prod.definition.length === 1 ? `${inner}*` : `( ${inner} )*`;
  } else if (prod instanceof RepetitionMandatory) {
    const inner = prod.definition
      .map((p) => renderProduction(p, collectedTerminals))
      .join(" ");
    return prod.definition.length === 1 ? `${inner}+` : `( ${inner} )+`;
  } else if (prod instanceof RepetitionWithSeparator) {
    const inner = prod.definition
      .map((p) => renderProduction(p, collectedTerminals))
      .join(" ");
    const sep = tokenLabel(prod.separator);
    collectedTerminals.set(prod.separator.name, prod.separator);
    return `( ${inner} ( ${sep} ${inner} )* )?`;
  } else if (prod instanceof RepetitionMandatoryWithSeparator) {
    const inner = prod.definition
      .map((p) => renderProduction(p, collectedTerminals))
      .join(" ");
    const sep = tokenLabel(prod.separator);
    collectedTerminals.set(prod.separator.name, prod.separator);
    return `${inner} ( ${sep} ${inner} )*`;
  } else if (prod instanceof Alternation) {
    const alts = prod.definition.map((alt) => {
      if (alt.definition.length === 0) {
        return "EMPTY_ALT";
      }
      return alt.definition
        .map((p) => renderProduction(p, collectedTerminals))
        .join(" ");
    });
    return `( ${alts.join(" | ")} )`;
  } else if (prod instanceof Alternative) {
    return prod.definition
      .map((p) => renderProduction(p, collectedTerminals))
      .join(" ");
  }
  /* c8 ignore next */
  throw new Error("non exhaustive match");
}

/**
 * Converts a Chevrotain grammar (array of top-level Rules) to an EBNF
 * text representation using W3C-style EBNF notation.
 *
 * Non-terminal rules are emitted first, followed by a blank line and then
 * terminal token definitions. Terminal patterns are formatted as:
 *   - `/pattern/flags` for RegExp patterns
 *   - `"string"` for string literal patterns
 *   - `/* custom token *\/` for function-based custom patterns
 *   - `/* no pattern *\/` for tokens without a defined pattern
 *
 * @param rules - The top-level grammar rules obtained from `parser.getGAstProductions()`.
 * @returns The grammar as an EBNF string.
 */
export function grammarToEbnf(rules: Rule[]): string {
  const collectedTerminals = new Map<string, TokenType>();

  const ruleLines = rules.map((rule) =>
    renderProduction(rule, collectedTerminals),
  );

  const terminalLines: string[] = [];
  for (const [, tokenType] of collectedTerminals) {
    const label = tokenLabel(tokenType);
    terminalLines.push(`${label} ::= ${tokenPatternToEbnf(tokenType)}`);
  }

  const sections: string[] = [...ruleLines];
  if (terminalLines.length > 0) {
    sections.push("", ...terminalLines);
  }

  return sections.join("\n");
}
