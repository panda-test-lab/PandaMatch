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
      clean = clean.replace(/(^|\r?\n)\s*\\hline\s*(?=\r?$|\r?\n|$)/gm, '$1\\rule{10em}{0.4pt}');

      return katex.renderToString(clean, {
        displayMode,
        throwOnError: false,
        output: 'htmlAndMathml',
        strict: false,
        trust: false,
      });
    } catch {
      return '';
    }
  }, [latex, displayMode]);

  if (!renderedHtml) {
    return (
      <span className={`select-text text-inherit text-slate-950 dark:text-slate-50 ${className}`} style={{ fontSize: 'inherit', lineHeight: 'inherit', letterSpacing: 'inherit' }}>
        {latex}
      </span>
    );
  }

  return (
    <span
      className={`latex-renderer inline-block max-w-full select-text text-inherit text-slate-950 dark:text-slate-50 ${className}`}
      style={{ fontSize: 'inherit', lineHeight: 'inherit', letterSpacing: 'inherit' }}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};
