import { expect } from "chai";
import type { ITokenConfig, TokenType } from "@chevrotain/types";
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
} from "../src/api.js";
import { grammarToEbnf } from "../src/grammar_to_ebnf.js";

function createToken(opts: ITokenConfig & { label?: string }): TokenType {
  const tok: TokenType = { name: opts.name, PATTERN: opts.pattern };
  if (opts.label !== undefined) {
    tok.LABEL = opts.label;
  }
  return tok;
}

const Comma = createToken({ name: "Comma", pattern: /,/ });
const NewLine = createToken({ name: "NewLine", pattern: /\r?\n/ });
const StringLiteralTok = createToken({
  name: "StringLiteral",
  pattern: "hello",
});
const PlusTok = createToken({ name: "Plus", pattern: /\+/, label: "+" });
const CustomTok = createToken({ name: "Custom", pattern: () => null });
const NoPatternTok = createToken({ name: "NoPattern" });

describe("grammarToEbnf", () => {
  describe("terminal pattern serialization", () => {
    it("serializes a RegExp pattern without flags", () => {
      const rule = new Rule({
        name: "myRule",
        definition: [new Terminal({ terminalType: Comma })],
      });
      const result = grammarToEbnf([rule]);
      expect(result).to.include("Comma ::= /,/");
    });

    it("serializes a RegExp pattern with flags", () => {
      const CaseInsensitive = createToken({
        name: "CaseInsensitive",
        pattern: /abc/i,
      });
      const rule = new Rule({
        name: "myRule",
        definition: [new Terminal({ terminalType: CaseInsensitive })],
      });
      const result = grammarToEbnf([rule]);
      expect(result).to.include("CaseInsensitive ::= /abc/i");
    });

    it("serializes a string literal pattern", () => {
      const rule = new Rule({
        name: "myRule",
        definition: [new Terminal({ terminalType: StringLiteralTok })],
      });
      const result = grammarToEbnf([rule]);
      expect(result).to.include('StringLiteral ::= "hello"');
    });

    it("serializes a custom function pattern", () => {
      const rule = new Rule({
        name: "myRule",
        definition: [new Terminal({ terminalType: CustomTok })],
      });
      const result = grammarToEbnf([rule]);
      expect(result).to.include("Custom ::= /* custom token */");
    });

    it("serializes a token without a pattern", () => {
      const rule = new Rule({
        name: "myRule",
        definition: [new Terminal({ terminalType: NoPatternTok })],
      });
      const result = grammarToEbnf([rule]);
      expect(result).to.include("NoPattern ::= /* no pattern */");
    });

    it("uses the token label in rules and terminal definitions", () => {
      const rule = new Rule({
        name: "myRule",
        definition: [new Terminal({ terminalType: PlusTok })],
      });
      const result = grammarToEbnf([rule]);
      expect(result).to.include("myRule ::= +");
      expect(result).to.include("+ ::= /\\+/");
    });
  });

  describe("rule body serialization", () => {
    it("serializes a sequence of terminals and non-terminals", () => {
      const rule = new Rule({
        name: "row",
        definition: [
          new Terminal({ terminalType: Comma }),
          new NonTerminal({ nonTerminalName: "field" }),
          new Terminal({ terminalType: NewLine }),
        ],
      });
      const result = grammarToEbnf([rule]);
      expect(result).to.include("row ::= Comma field NewLine");
    });

    it("serializes Option with single item as postfix ?", () => {
      const rule = new Rule({
        name: "myRule",
        definition: [
          new Option({
            definition: [new Terminal({ terminalType: Comma })],
          }),
        ],
      });
      const result = grammarToEbnf([rule]);
      expect(result).to.include("myRule ::= Comma?");
    });

    it("serializes Option with multiple items wrapped in parens", () => {
      const rule = new Rule({
        name: "myRule",
        definition: [
          new Option({
            definition: [
              new Terminal({ terminalType: Comma }),
              new NonTerminal({ nonTerminalName: "field" }),
            ],
          }),
        ],
      });
      const result = grammarToEbnf([rule]);
      expect(result).to.include("myRule ::= ( Comma field )?");
    });

    it("serializes Repetition (zero or more) with single item as postfix *", () => {
      const rule = new Rule({
        name: "myRule",
        definition: [
          new Repetition({
            definition: [new NonTerminal({ nonTerminalName: "item" })],
          }),
        ],
      });
      const result = grammarToEbnf([rule]);
      expect(result).to.include("myRule ::= item*");
    });

    it("serializes Repetition with multiple items wrapped in parens", () => {
      const rule = new Rule({
        name: "myRule",
        definition: [
          new Repetition({
            definition: [
              new Terminal({ terminalType: Comma }),
              new NonTerminal({ nonTerminalName: "field" }),
            ],
          }),
        ],
      });
      const result = grammarToEbnf([rule]);
      expect(result).to.include("myRule ::= ( Comma field )*");
    });

    it("serializes RepetitionMandatory (one or more) with single item as postfix +", () => {
      const rule = new Rule({
        name: "myRule",
        definition: [
          new RepetitionMandatory({
            definition: [new NonTerminal({ nonTerminalName: "item" })],
          }),
        ],
      });
      const result = grammarToEbnf([rule]);
      expect(result).to.include("myRule ::= item+");
    });

    it("serializes RepetitionMandatory with multiple items wrapped in parens", () => {
      const rule = new Rule({
        name: "myRule",
        definition: [
          new RepetitionMandatory({
            definition: [
              new Terminal({ terminalType: Comma }),
              new NonTerminal({ nonTerminalName: "field" }),
            ],
          }),
        ],
      });
      const result = grammarToEbnf([rule]);
      expect(result).to.include("myRule ::= ( Comma field )+");
    });

    it("serializes RepetitionWithSeparator (zero or more with sep)", () => {
      const rule = new Rule({
        name: "myRule",
        definition: [
          new RepetitionWithSeparator({
            definition: [new NonTerminal({ nonTerminalName: "item" })],
            separator: Comma,
          }),
        ],
      });
      const result = grammarToEbnf([rule]);
      expect(result).to.include("myRule ::= ( item ( Comma item )* )?");
    });

    it("serializes RepetitionMandatoryWithSeparator (one or more with sep)", () => {
      const rule = new Rule({
        name: "myRule",
        definition: [
          new RepetitionMandatoryWithSeparator({
            definition: [new NonTerminal({ nonTerminalName: "item" })],
            separator: Comma,
          }),
        ],
      });
      const result = grammarToEbnf([rule]);
      expect(result).to.include("myRule ::= item ( Comma item )*");
    });

    it("serializes Alternation", () => {
      const rule = new Rule({
        name: "field",
        definition: [
          new Alternation({
            definition: [
              new Alternative({
                definition: [new NonTerminal({ nonTerminalName: "text" })],
              }),
              new Alternative({
                definition: [new Terminal({ terminalType: StringLiteralTok })],
              }),
            ],
          }),
        ],
      });
      const result = grammarToEbnf([rule]);
      expect(result).to.include("field ::= ( text | StringLiteral )");
    });

    it("serializes Alternation with an EMPTY_ALT (empty alternative)", () => {
      const rule = new Rule({
        name: "field",
        definition: [
          new Alternation({
            definition: [
              new Alternative({
                definition: [new Terminal({ terminalType: Comma })],
              }),
              new Alternative({ definition: [] }),
            ],
          }),
        ],
      });
      const result = grammarToEbnf([rule]);
      expect(result).to.include("field ::= ( Comma | EMPTY_ALT )");
    });
  });

  describe("multi-rule grammar serialization", () => {
    it("emits multiple rules each on its own line", () => {
      const ruleA = new Rule({
        name: "ruleA",
        definition: [new NonTerminal({ nonTerminalName: "ruleB" })],
      });
      const ruleB = new Rule({
        name: "ruleB",
        definition: [new Terminal({ terminalType: Comma })],
      });
      const result = grammarToEbnf([ruleA, ruleB]);
      const lines = result.split("\n");
      expect(lines[0]).to.equal("ruleA ::= ruleB");
      expect(lines[1]).to.equal("ruleB ::= Comma");
    });

    it("emits a blank line between parser rules and terminal definitions", () => {
      const rule = new Rule({
        name: "myRule",
        definition: [new Terminal({ terminalType: Comma })],
      });
      const result = grammarToEbnf([rule]);
      const lines = result.split("\n");
      expect(lines[0]).to.equal("myRule ::= Comma");
      expect(lines[1]).to.equal("");
      expect(lines[2]).to.equal("Comma ::= /,/");
    });

    it("deduplicates terminals that appear more than once", () => {
      const rule = new Rule({
        name: "myRule",
        definition: [
          new Terminal({ terminalType: Comma }),
          new Terminal({ terminalType: Comma }),
        ],
      });
      const result = grammarToEbnf([rule]);
      const matches = result.match(/Comma ::=/g);
      expect(matches).to.have.length(1);
    });

    it("includes separator tokens in terminal definitions", () => {
      const rule = new Rule({
        name: "myRule",
        definition: [
          new RepetitionWithSeparator({
            definition: [new NonTerminal({ nonTerminalName: "item" })],
            separator: Comma,
          }),
        ],
      });
      const result = grammarToEbnf([rule]);
      expect(result).to.include("Comma ::= /,/");
    });

    it("produces no terminal section when there are no terminals", () => {
      const rule = new Rule({
        name: "myRule",
        definition: [new NonTerminal({ nonTerminalName: "other" })],
      });
      const result = grammarToEbnf([rule]);
      expect(result).to.equal("myRule ::= other");
    });
  });

  describe("CSV-like grammar example", () => {
    it("serializes a representative CSV grammar correctly", () => {
      const Text = createToken({ name: "Text", pattern: /[^,\n\r"]+/ });
      const StringTok = createToken({
        name: "StringTok",
        pattern: /"(?:""|[^"])*"/,
      });
      const CommaToken = createToken({ name: "Comma", pattern: /,/ });
      const NewLineToken = createToken({ name: "NewLine", pattern: /\r?\n/ });

      const csvFile = new Rule({
        name: "csvFile",
        definition: [
          new NonTerminal({ nonTerminalName: "hdr" }),
          new RepetitionMandatory({
            definition: [new NonTerminal({ nonTerminalName: "row" })],
          }),
        ],
      });
      const hdr = new Rule({
        name: "hdr",
        definition: [new NonTerminal({ nonTerminalName: "row" })],
      });
      const row = new Rule({
        name: "row",
        definition: [
          new NonTerminal({ nonTerminalName: "field" }),
          new Repetition({
            definition: [
              new Terminal({ terminalType: CommaToken }),
              new NonTerminal({ nonTerminalName: "field" }),
            ],
          }),
          new Terminal({ terminalType: NewLineToken }),
        ],
      });
      const field = new Rule({
        name: "field",
        definition: [
          new Alternation({
            definition: [
              new Alternative({
                definition: [new Terminal({ terminalType: Text })],
              }),
              new Alternative({
                definition: [new Terminal({ terminalType: StringTok })],
              }),
              new Alternative({ definition: [] }),
            ],
          }),
        ],
      });

      const result = grammarToEbnf([csvFile, hdr, row, field]);
      expect(result).to.equal(
        [
          "csvFile ::= hdr row+",
          "hdr ::= row",
          "row ::= field ( Comma field )* NewLine",
          "field ::= ( Text | StringTok | EMPTY_ALT )",
          "",
          "Comma ::= /,/",
          "NewLine ::= /\\r?\\n/",
          "Text ::= /[^,\\n\\r\"]+/",
          'StringTok ::= /"(?:""|[^"])*"/',
        ].join("\n"),
      );
    });
  });
});
