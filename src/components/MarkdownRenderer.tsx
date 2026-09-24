import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Parse code blocks with ```lang ... ```
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-[15px] leading-relaxed break-words">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Extract language and code
          const firstLineEnd = part.indexOf('\n');
          let language = 'code';
          let codeText = '';

          if (firstLineEnd !== -1) {
            language = part.slice(3, firstLineEnd).trim() || 'code';
            codeText = part.slice(firstLineEnd + 1, -3);
          } else {
            codeText = part.slice(3, -3);
          }

          return <CodeBlock key={index} code={codeText} language={language} />;
        }

        // Render regular markdown text
        return <FormattedText key={index} text={part} />;
      })}
    </div>
  );
};

const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-indigo-500/20 bg-slate-950/80 shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-indigo-500/10 text-xs text-slate-400 font-mono">
        <span className="uppercase tracking-wider font-semibold text-indigo-400">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs sm:text-sm font-mono text-emerald-300 bg-slate-950 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <>
      {lines.map((line, lIndex) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={lIndex} className="h-2" />;
        }

        // Heading 3: ###
        if (line.startsWith('### ')) {
          return (
            <h3 key={lIndex} className="text-base sm:text-lg font-bold text-indigo-200 mt-3 mb-1">
              {renderInline(line.replace('### ', ''))}
            </h3>
          );
        }

        // Heading 2: ##
        if (line.startsWith('## ')) {
          return (
            <h2 key={lIndex} className="text-lg sm:text-xl font-bold text-indigo-300 mt-4 mb-2 pb-1 border-b border-indigo-500/20">
              {renderInline(line.replace('## ', ''))}
            </h2>
          );
        }

        // Heading 1: #
        if (line.startsWith('# ')) {
          return (
            <h1 key={lIndex} className="text-xl sm:text-2xl font-extrabold text-white mt-4 mb-2">
              {renderInline(line.replace('# ', ''))}
            </h1>
          );
        }

        // Blockquote: >
        if (line.startsWith('> ')) {
          return (
            <blockquote
              key={lIndex}
              className="border-l-4 border-indigo-500 pl-3 py-1 my-1 italic text-slate-300 bg-indigo-950/20 rounded-r"
            >
              {renderInline(line.replace('> ', ''))}
            </blockquote>
          );
        }

        // Unordered list item: - or *
        if (/^[-*]\s+/.test(trimmed)) {
          const listText = trimmed.replace(/^[-*]\s+/, '');
          return (
            <div key={lIndex} className="flex items-start gap-2 my-1 pl-1">
              <span className="text-indigo-400 mt-1.5 text-xs">•</span>
              <div className="flex-1 text-slate-200">{renderInline(listText)}</div>
            </div>
          );
        }

        // Numbered list item: 1. 2. etc.
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={lIndex} className="flex items-start gap-2 my-1 pl-1">
              <span className="text-indigo-400 font-semibold text-xs mt-0.5">{numMatch[1]}.</span>
              <div className="flex-1 text-slate-200">{renderInline(numMatch[2])}</div>
            </div>
          );
        }

        // Standard line
        return (
          <p key={lIndex} className="my-1 text-slate-200">
            {renderInline(line)}
          </p>
        );
      })}
    </>
  );
};

// Helper to render bold **text**, inline `code`, and links
function renderInline(str: string): React.ReactNode {
  // Regex splitting by bold (**...**) and inline code (`...`)
  const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((chunk, i) => {
    if (chunk.startsWith('**') && chunk.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-white">
          {chunk.slice(2, -2)}
        </strong>
      );
    }
    if (chunk.startsWith('`') && chunk.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-mono text-[13px]"
        >
          {chunk.slice(1, -1)}
        </code>
      );
    }
    return chunk;
  });
}
