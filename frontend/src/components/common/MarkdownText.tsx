import React from "react";

interface MarkdownTextProps {
  content: string;
  className?: string;
}

/**
 * Lightweight markdown renderer — no external library.
 * Handles: **bold**, *italic*, numbered lists, bullet lists, line breaks.
 * Designed for rendering AI agent chat messages.
 */
const MarkdownText: React.FC<MarkdownTextProps> = ({ content, className = "" }) => {
  const renderInline = (text: string): React.ReactNode[] => {
    // Process **bold** and *italic* inline
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      if (match[0].startsWith("**")) {
        parts.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>);
      } else {
        parts.push(<em key={match.index}>{match[3]}</em>);
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts;
  };

  const renderContent = () => {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Horizontal rule ---
      if (/^---+$/.test(line.trim())) {
        elements.push(<hr key={i} className="my-2 border-slate-300/50" />);
        i++;
        continue;
      }

      // Numbered list item: "1. text"
      if (/^\d+\.\s/.test(line)) {
        const listItems: React.ReactNode[] = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
          const text = lines[i].replace(/^\d+\.\s/, "");
          listItems.push(
            <li key={i} className="ml-1">
              {renderInline(text)}
            </li>
          );
          i++;
        }
        elements.push(
          <ol key={`ol-${i}`} className="list-decimal list-inside space-y-0.5 my-1">
            {listItems}
          </ol>
        );
        continue;
      }

      // Bullet list item: "• text" or "- text" or "* text"
      if (/^[•\-\*]\s/.test(line.trim())) {
        const listItems: React.ReactNode[] = [];
        while (i < lines.length && /^[•\-\*]\s/.test(lines[i].trim())) {
          const text = lines[i].trim().replace(/^[•\-\*]\s/, "");
          listItems.push(
            <li key={i} className="ml-1 flex gap-1.5">
              <span className="text-amber-500 shrink-0">•</span>
              <span>{renderInline(text)}</span>
            </li>
          );
          i++;
        }
        elements.push(
          <ul key={`ul-${i}`} className="space-y-0.5 my-1">
            {listItems}
          </ul>
        );
        continue;
      }

      // Empty line — spacer
      if (line.trim() === "") {
        if (elements.length > 0) {
          elements.push(<div key={`sp-${i}`} className="h-1.5" />);
        }
        i++;
        continue;
      }

      // Regular paragraph line
      elements.push(
        <p key={i} className="leading-relaxed">
          {renderInline(line)}
        </p>
      );
      i++;
    }

    return elements;
  };

  return (
    <div className={`text-xs space-y-0.5 ${className}`}>
      {renderContent()}
    </div>
  );
};

export default MarkdownText;
