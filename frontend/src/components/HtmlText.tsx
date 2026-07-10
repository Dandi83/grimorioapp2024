import React from "react";
import { StyleSheet, Text, TextStyle } from "react-native";

import { theme } from "@/src/theme";

/**
 * Minimal HTML renderer for spell descriptions.
 * Supports: <b>, <strong>, <i>, <em>, <br>, <br/>, <br />, and HTML entities.
 * Everything is rendered inside a single <Text> so line-height and wrapping stay clean.
 */

type Token =
  | { kind: "text"; value: string }
  | { kind: "openTag"; tag: string }
  | { kind: "closeTag"; tag: string }
  | { kind: "selfClose"; tag: string };

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

function decodeEntities(s: string) {
  return s.replace(/&[a-zA-Z#0-9]+;/g, (m) => ENTITIES[m] ?? m);
}

function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  const re = /<\s*(\/?)\s*([a-zA-Z0-9]+)\s*(\/?)\s*>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m.index > last) {
      tokens.push({ kind: "text", value: html.slice(last, m.index) });
    }
    const isClose = !!m[1];
    const tag = m[2].toLowerCase();
    const isSelf = !!m[3] || tag === "br";
    if (isSelf) {
      tokens.push({ kind: "selfClose", tag });
    } else if (isClose) {
      tokens.push({ kind: "closeTag", tag });
    } else {
      tokens.push({ kind: "openTag", tag });
    }
    last = m.index + m[0].length;
  }
  if (last < html.length) {
    tokens.push({ kind: "text", value: html.slice(last) });
  }
  return tokens;
}

interface Props {
  html: string;
  baseStyle?: TextStyle;
  testID?: string;
}

export function HtmlText({ html, baseStyle, testID }: Props) {
  const tokens = tokenize(html || "");
  const stack: string[] = [];

  const nodes: React.ReactNode[] = [];
  let key = 0;

  const styleFor = (): TextStyle => {
    const s: TextStyle = {};
    if (stack.includes("b") || stack.includes("strong")) {
      s.fontWeight = "700";
      s.color = theme.colors.brand;
    }
    if (stack.includes("i") || stack.includes("em")) {
      s.fontStyle = "italic";
    }
    return s;
  };

  for (const tok of tokens) {
    if (tok.kind === "openTag") {
      stack.push(tok.tag);
    } else if (tok.kind === "closeTag") {
      const idx = stack.lastIndexOf(tok.tag);
      if (idx >= 0) stack.splice(idx, 1);
    } else if (tok.kind === "selfClose") {
      if (tok.tag === "br") {
        nodes.push(<Text key={key++}>{"\n"}</Text>);
      }
    } else if (tok.kind === "text") {
      const decoded = decodeEntities(tok.value);
      if (!decoded) continue;
      nodes.push(
        <Text key={key++} style={styleFor()}>
          {decoded}
        </Text>,
      );
    }
  }

  return (
    <Text style={[styles.base, baseStyle]} testID={testID}>
      {nodes}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: theme.colors.onSurfaceSecondary,
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    lineHeight: 26,
  },
});
