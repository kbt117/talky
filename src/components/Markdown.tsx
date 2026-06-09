import { useMemo } from 'react';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderInline(text: string): string {
  return text
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // inline code
    .replace(/`([^`]+)`/g, '<code class="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    // links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="underline text-blue-500">$1</a>');
}

function parseMarkdown(src: string): string {
  const lines = src.split('\n');
  const out: string[] = [];
  let inCode = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let inList = false;

  const flushList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.trimStart().startsWith('```')) {
      if (!inCode) {
        flushList();
        inCode = true;
        codeLang = line.trim().slice(3).trim();
        codeLines = [];
      } else {
        const code = escapeHtml(codeLines.join('\n'));
        out.push(
          `<div class="relative group my-3">` +
            `<div class="flex items-center justify-between bg-zinc-800 text-zinc-300 text-xs px-3 py-1.5 rounded-t font-mono">` +
              `<span>${codeLang || 'code'}</span>` +
            `</div>` +
            `<pre class="bg-zinc-900 text-zinc-100 p-3 rounded-b overflow-x-auto text-sm leading-relaxed"><code>${code}</code></pre>` +
          `</div>`
        );
        inCode = false;
        codeLang = '';
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    // Blank line
    if (!line.trim()) {
      flushList();
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const sizes = ['text-xl font-bold', 'text-lg font-bold', 'text-base font-semibold', 'text-sm font-semibold'];
      out.push(`<h${level} class="${sizes[level - 1]} mt-4 mb-1">${renderInline(escapeHtml(headingMatch[2]))}</h${level}>`);
      continue;
    }

    // Unordered list
    const listMatch = line.match(/^\s*[-*+]\s+(.+)/);
    if (listMatch) {
      if (!inList) {
        out.push('<ul class="list-disc list-inside space-y-0.5 my-1">');
        inList = true;
      }
      out.push(`<li>${renderInline(escapeHtml(listMatch[1]))}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\s*\d+\.\s+(.+)/);
    if (olMatch) {
      if (!inList) {
        out.push('<ul class="list-decimal list-inside space-y-0.5 my-1">');
        inList = true;
      }
      out.push(`<li>${renderInline(escapeHtml(olMatch[1]))}</li>`);
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      flushList();
      out.push('<hr class="my-3 border-current opacity-20"/>');
      continue;
    }

    // Paragraph
    flushList();
    out.push(`<p class="my-1 leading-relaxed">${renderInline(escapeHtml(line))}</p>`);
  }

  flushList();

  // Handle unclosed code block
  if (inCode) {
    const code = escapeHtml(codeLines.join('\n'));
    out.push(
      `<pre class="bg-zinc-900 text-zinc-100 p-3 rounded overflow-x-auto text-sm leading-relaxed my-3"><code>${code}</code></pre>`
    );
  }

  return out.join('\n');
}

export default function Markdown({ content }: { content: string }) {
  const html = useMemo(() => parseMarkdown(content), [content]);
  return (
    <div
      className="prose-sm max-w-none break-words"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
