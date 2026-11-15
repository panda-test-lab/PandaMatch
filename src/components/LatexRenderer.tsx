import React, { useMemo } from 'react';
import katex from 'katex';

interface LatexRendererProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export const LatexRenderer: React.FC<LatexRendererProps> = ({
  latex,
  displayMode = true,
  className = '',
}) => {
  const renderedHtml = useMemo(() => {
    if (!latex || !latex.trim()) return '';
    try {
      let clean = latex.trim();
      if (clean.startsWith('$$') && clean.endsWith('$$')) {
        clean = clean.slice(2, -2).trim();
      } else if (clean.startsWith('$') && clean.endsWith('$')) {
        clean = clean.slice(1, -1).trim();
      }

      return katex.renderToString(clean, {
        displayMode,
        throwOnError: false,
        output: 'htmlAndMathml',
      });
    } catch {
      return '';
    }
  }, [latex, displayMode]);

  if (!renderedHtml) {
    return (
      <span className={`font-mono text-xs font-bold text-slate-950 dark:text-slate-50 ${className}`}>
        {latex}
      </span>
    );
  }

  return (
    <span
      className={`inline-block select-none font-bold text-slate-950 dark:text-slate-50 filter drop-shadow-xs ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};
