import React, { useState } from 'react';
import { Check, Copy, Terminal, Code2 } from 'lucide-react';
import type { User } from '../types';

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
}

// Token types for lightweight, high-performance syntax highlighting
type TokenType = 'keyword' | 'string' | 'comment' | 'number' | 'boolean' | 'function' | 'operator' | 'type' | 'text';

interface Token {
  type: TokenType;
  value: string;
}

const KEYWORDS = new Set([
  'function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while', 'switch',
  'case', 'break', 'continue', 'new', 'this', 'class', 'extends', 'super', 'import',
  'export', 'default', 'from', 'as', 'try', 'catch', 'finally', 'throw', 'async',
  'await', 'yield', 'typeof', 'instanceof', 'in', 'of', 'void', 'delete',
  // Python
  'def', 'elif', 'is', 'not', 'and', 'or', 'pass', 'lambda', 'with', 'global',
  // SQL
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'UPDATE', 'DELETE', 'JOIN', 'LEFT',
  'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET',
  'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'VIEW', 'AND', 'OR', 'NOT', 'NULL',
  // Rust / Go / C
  'fn', 'pub', 'mut', 'impl', 'struct', 'enum', 'trait', 'match', 'package', 'go', 'chan',
]);

const TYPES = new Set([
  'string', 'number', 'boolean', 'any', 'void', 'unknown', 'never', 'object',
  'Promise', 'Array', 'Record', 'Set', 'Map', 'Int', 'Float', 'String', 'Boolean',
  'int', 'float', 'char', 'double', 'bool', 'str', 'list', 'dict',
]);

const BOOLEANS = new Set(['true', 'false', 'null', 'undefined', 'None', 'True', 'False', 'nil']);

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    // Comments
    if (line.slice(i, i + 2) === '//' || line[i] === '#' || line.slice(i, i + 2) === '--') {
      tokens.push({ type: 'comment', value: line.slice(i) });
      break;
    }

    // Strings
    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const quote = line[i];
      let end = i + 1;
      while (end < line.length && line[end] !== quote) {
        if (line[end] === '\\') end++; // skip escaped
        end++;
      }
      end = Math.min(end + 1, line.length);
      tokens.push({ type: 'string', value: line.slice(i, end) });
      i = end;
      continue;
    }

    // Numbers
    if (/\d/.test(line[i])) {
      let end = i;
      while (end < line.length && /[\d.xXa-fA-F_]/.test(line[end])) {
        end++;
      }
      tokens.push({ type: 'number', value: line.slice(i, end) });
      i = end;
      continue;
    }

    // Words (identifiers, keywords, types)
    if (/[a-zA-Z_$]/.test(line[i])) {
      let end = i;
      while (end < line.length && /[a-zA-Z0-9_$]/.test(line[end])) {
        end++;
      }
      const word = line.slice(i, end);
      const nextChar = line[end];

      if (KEYWORDS.has(word) || KEYWORDS.has(word.toUpperCase())) {
        tokens.push({ type: 'keyword', value: word });
      } else if (BOOLEANS.has(word)) {
        tokens.push({ type: 'boolean', value: word });
      } else if (TYPES.has(word)) {
        tokens.push({ type: 'type', value: word });
      } else if (nextChar === '(') {
        tokens.push({ type: 'function', value: word });
      } else {
        tokens.push({ type: 'text', value: word });
      }
      i = end;
      continue;
    }

    // Operators & Punctuation
    if (/[=+\-*/%&|^!~?:<>(){}[\].,;]/.test(line[i])) {
      tokens.push({ type: 'operator', value: line[i] });
      i++;
      continue;
    }

    // Whitespace and other characters
    tokens.push({ type: 'text', value: line[i] });
    i++;
  }

  return tokens;
}

const TOKEN_COLORS: Record<TokenType, string> = {
  keyword: 'text-purple-400 font-semibold',
  string: 'text-emerald-300',
  comment: 'text-neutral-500 italic',
  number: 'text-amber-300',
  boolean: 'text-amber-400 font-semibold',
  function: 'text-sky-300',
  operator: 'text-neutral-400',
  type: 'text-teal-300',
  text: 'text-neutral-200',
};

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'typescript',
  showLineNumbers = true,
}) => {
  const [copied, setCopied] = useState(false);

  const cleanCode = code.trim();
  const lines = cleanCode.split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const normalizedLang = (language || 'code').toLowerCase().trim();

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-white/10 bg-[#0a0b10] shadow-lg text-xs group">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#12141c] border-b border-white/10 select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-300 font-bold">
            {normalizedLang}
          </span>
          <span className="text-[10px] text-neutral-500 font-mono">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-all text-[11px]"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-neutral-400 group-hover:text-white" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="p-3 overflow-x-auto font-mono text-[12px] leading-relaxed select-text">
        <table className="border-collapse w-full">
          <tbody>
            {lines.map((line, idx) => {
              const tokens = tokenizeLine(line);
              return (
                <tr key={idx} className="hover:bg-white/[0.02]">
                  {showLineNumbers && (
                    <td className="pr-4 text-right select-none text-neutral-600 text-[11px] font-mono align-top w-8">
                      {idx + 1}
                    </td>
                  )}
                  <td className="whitespace-pre align-top">
                    {tokens.map((token, tIdx) => (
                      <span key={tIdx} className={TOKEN_COLORS[token.type]}>
                        {token.value}
                      </span>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Component to render message text containing markdown code blocks, inline code, and @mentions
export const MessageContentRenderer: React.FC<{
  text: string;
  allUsers?: User[];
}> = ({ text, allUsers = [] }) => {
  if (!text) return null;

  // Split text by markdown code fences: ```[lang]?\n[code]\n```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const [fullMatch, lang, code] = match;
    const matchStart = match.index;

    // Render regular text before code block
    if (matchStart > lastIndex) {
      const textChunk = text.slice(lastIndex, matchStart);
      parts.push(renderInlineFormatting(textChunk, allUsers, `txt_${lastIndex}`));
    }

    // Render syntax-highlighted code block
    parts.push(
      <CodeBlock
        key={`code_${matchStart}`}
        code={code}
        language={lang || 'typescript'}
      />
    );

    lastIndex = matchStart + fullMatch.length;
  }

  // Render remaining text after last code block
  if (lastIndex < text.length) {
    const textChunk = text.slice(lastIndex);
    parts.push(renderInlineFormatting(textChunk, allUsers, `txt_${lastIndex}`));
  }

  return <div className="space-y-1">{parts}</div>;
};

// Helper for inline code (`code`) and @mentions
function renderInlineFormatting(text: string, allUsers: User[], keyPrefix: string): React.ReactNode {
  // Regex to split by inline code `...` or @username
  const inlineRegex = /(`[^`]+`)|(@[a-zA-Z0-9_]+)/g;
  const elements: React.ReactNode[] = [];
  let lastIdx = 0;
  let inlineMatch: RegExpExecArray | null;

  while ((inlineMatch = inlineRegex.exec(text)) !== null) {
    const matchStr = inlineMatch[0];
    const matchStart = inlineMatch.index;

    if (matchStart > lastIdx) {
      elements.push(text.slice(lastIdx, matchStart));
    }

    if (matchStr.startsWith('`') && matchStr.endsWith('`')) {
      // Inline code
      const codeSnippet = matchStr.slice(1, -1);
      elements.push(
        <code
          key={`${keyPrefix}_code_${matchStart}`}
          className="px-1.5 py-0.5 rounded-md bg-white/10 text-amber-300 font-mono text-[11px] border border-white/10 mx-0.5"
        >
          {codeSnippet}
        </code>
      );
    } else if (matchStr.startsWith('@')) {
      // User mention
      const username = matchStr.slice(1);
      const matchedUser = allUsers.find(
        (u) => u.username.toLowerCase() === username.toLowerCase()
      );
      elements.push(
        <span
          key={`${keyPrefix}_mention_${matchStart}`}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium text-[11px] select-none hover:bg-indigo-500/30 transition-colors"
          title={matchedUser ? `${matchedUser.displayName} (@${matchedUser.username})` : `@${username}`}
        >
          {matchedUser?.avatar ? (
            <span className="text-[10px]">{matchedUser.avatar}</span>
          ) : (
            <span>@</span>
          )}
          <span>{matchedUser?.displayName || username}</span>
        </span>
      );
    }

    lastIdx = matchStart + matchStr.length;
  }

  if (lastIdx < text.length) {
    elements.push(text.slice(lastIdx));
  }

  return (
    <span key={keyPrefix} className="whitespace-pre-wrap leading-relaxed">
      {elements}
    </span>
  );
}
