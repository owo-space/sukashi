import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { test } from "node:test";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const i18nSource = readFileSync(path.join(root, "apps/web/src/lib/i18n.tsx"), "utf8");

function extractInitializer(name) {
  const idx = i18nSource.indexOf(`const ${name}`);
  assert.notEqual(idx, -1, `missing ${name}`);
  const eq = i18nSource.indexOf("=", idx);
  const start = i18nSource.indexOf("{", eq);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = start; i < i18nSource.length; i += 1) {
    const ch = i18nSource[i];
    const next = i18nSource[i + 1];

    if (lineComment) {
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "/" && next === "/") {
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      blockComment = true;
      i += 1;
      continue;
    }
    if (ch === "\"" || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i18nSource.slice(start, i + 1);
    }
  }

  throw new Error(`unterminated ${name}`);
}

const EN = vm.runInNewContext(`(${extractInitializer("EN")})`);
const JA = vm.runInNewContext(`(${extractInitializer("JA")})`, { EN });
const ZH_TW_TERMS = vm.runInNewContext(`(${extractInitializer("ZH_TW_TERMS")})`);
const REPLACEMENTS = vm.runInNewContext(`(${extractInitializer("REPLACEMENTS")})`);

function preserveWhitespace(source, translated) {
  const prefix = source.match(/^\s*/u)?.[0] ?? "";
  const suffix = source.match(/\s*$/u)?.[0] ?? "";
  return `${prefix}${translated}${suffix}`;
}

function convertToTraditional(source) {
  let output = source;
  for (const [from, to] of Object.entries(ZH_TW_TERMS).sort((a, b) => b[0].length - a[0].length)) {
    output = output.split(from).join(to);
  }
  return output;
}

function replaceKnownTerms(source, locale) {
  if (locale === "zh-CN") return source;
  if (locale === "zh-TW") return convertToTraditional(source);
  const dictionary = locale === "ja" ? JA : EN;
  let output = source;
  for (const [from, to] of Object.entries(dictionary)
    .filter(([from]) => from.trim().length > 1 && /[\p{Script=Han}]/u.test(from))
    .sort((a, b) => b[0].length - a[0].length)) {
    output = output.split(from).join(to);
  }
  return output;
}

function localizeReplacementOutput(source, locale) {
  if (locale === "zh-TW") return convertToTraditional(source);
  if (locale === "en" || locale === "ja") return replaceKnownTerms(source, locale);
  return source;
}

function translateText(source, locale) {
  if (!source) return source;
  if (locale === "zh-CN") return source;
  const trimmed = source.trim();
  if (!trimmed) return source;

  if (locale === "en" || locale === "ja") {
    const exact = (locale === "ja" ? JA : EN)[trimmed];
    if (exact) return preserveWhitespace(source, exact);
  }

  for (const [pattern, replacement] of REPLACEMENTS[locale]) {
    if (pattern.test(trimmed)) {
      return preserveWhitespace(
        source,
        localizeReplacementOutput(trimmed.replace(pattern, replacement), locale)
      );
    }
  }

  if (locale === "zh-TW") return preserveWhitespace(source, convertToTraditional(trimmed));
  return preserveWhitespace(source, replaceKnownTerms(trimmed, locale));
}

function walkSourceFiles(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    const stat = statSync(file);
    if (stat.isDirectory()) walkSourceFiles(file, files);
    else if (/\.(tsx?|jsx?)$/.test(name) && !file.endsWith("i18n.tsx")) files.push(file);
  }
  return files;
}

function unquote(token) {
  if (token[0] === "`") return token.slice(1, -1).replace(/\$\{[^}]*\}/g, "{x}");
  try {
    return vm.runInNewContext(token);
  } catch {
    return token.slice(1, -1);
  }
}

function collectStaticUiCandidates() {
  const candidates = new Map();
  const literalRe = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/gs;
  const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

  for (const file of walkSourceFiles(path.join(root, "apps/web/src"))) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(literalRe)) {
      const value = unquote(match[0]);
      if (cjk.test(value) && value.length < 180 && !value.includes("\n")) {
        candidates.set(value, path.relative(root, file));
      }
    }
    for (const match of source.matchAll(/>([^<>{]*[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}][^<>{]*)</gu)) {
      const value = match[1].replace(/\s+/g, " ").trim();
      if (value) candidates.set(value, path.relative(root, file));
    }
  }

  return [...candidates.entries()];
}

test("English UI translations do not leave static CJK fragments", () => {
  const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
  const dictionaryLeaks = Object.entries(EN).filter(([, value]) => cjk.test(value));
  assert.deepEqual(dictionaryLeaks, []);

  const sourceLeaks = collectStaticUiCandidates()
    .map(([source, file]) => [source, translateText(source, "en"), file])
    .filter(([, output]) => cjk.test(output));
  assert.deepEqual(sourceLeaks, []);

  assert.equal(translateText("重置订阅", "en"), "Reset Subscription");
  assert.equal(translateText('删除优惠券 "Alpha"？', "en"), 'Delete Coupon "Alpha"?');
});

test("Japanese UI translations do not inherit English fallbacks", () => {
  const inherited = Object.keys(EN).filter(
    (key) => /[\p{Script=Han}]/u.test(key) && JA[key] === EN[key]
  );
  assert.deepEqual(inherited, []);

  const sameAsEnglish = collectStaticUiCandidates()
    .map(([source, file]) => [source, translateText(source, "ja"), translateText(source, "en"), file])
    .filter(([, ja, en]) => ja === en && /[A-Za-z]/.test(ja));
  assert.deepEqual(sameAsEnglish, []);

  assert.equal(translateText('删除路由 "Alpha"？', "ja"), 'ルート "Alpha" を削除しますか？');
});

test("Traditional Chinese conversion covers static UI simplified leftovers", () => {
  const simplifiedResidue = /[后个条页与图径实试际网币种标门审发导转处户简体么逻辑题号将车变调划带来]/u;
  const leaks = collectStaticUiCandidates()
    .map(([source, file]) => [source, translateText(source, "zh-TW"), file])
    .filter(([, output]) => simplifiedResidue.test(output));
  assert.deepEqual(leaks, []);

  assert.equal(
    translateText("计费倍率,1x 表示按实际流量计费", "zh-TW"),
    "計費倍率,1x 表示按實際流量計費"
  );
});
