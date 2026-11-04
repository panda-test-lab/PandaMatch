import React, { useMemo, useState, useEffect } from 'react';
import katex from 'katex';
import { convertLatexOrTextToSmiles, renderSmilesToSvg } from '../utils/chemicalStructure';

interface LatexRendererProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
  isDark?: boolean;
}

export const LatexRenderer: React.FC<LatexRendererProps> = ({
  latex,
  displayMode = true,
  className = '',
  isDark,
}) => {
  const [chemSvg, setChemSvg] = useState<string | null>(null);

  const effectiveIsDark =
    isDark !== undefined
      ? isDark
      : typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  // Check if the input is a LaTeX ChemFig, SMILES, or chemical structure command
  const possibleSmiles = useMemo(() => {
    if (!latex) return null;
    return convertLatexOrTextToSmiles(latex);
  }, [latex]);

  useEffect(() => {
    let isCancelled = false;

    if (possibleSmiles) {
      renderSmilesToSvg(possibleSmiles, { isDark: effectiveIsDark, width: 220, height: 160 })
        .then((svg) => {
          if (!isCancelled) setChemSvg(svg);
        })
        .catch(() => {
          if (!isCancelled) setChemSvg(null);
        });
    } else {
      setChemSvg(null);
    }

    return () => {
      isCancelled = true;
    };
  }, [possibleSmiles, effectiveIsDark]);

  const renderedHtml = useMemo(() => {
    if (!latex || !latex.trim()) return '';
    try {
      // Clean leading/trailing $ or $$ if the user typed them
      let clean = latex.trim();
      if (clean.startsWith('$$') && clean.endsWith('$$')) {
        clean = clean.slice(2, -2).trim();
      } else if (clean.startsWith('$') && clean.endsWith('$')) {
        clean = clean.slice(1, -1).trim();
      }

      // If it's a pure chemfig command and we rendered SVG, return empty so SVG displays
      if (clean.startsWith('\\chemfig')) {
        return '';
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

  // If chemical 2D structure SVG is available, render that!
  if (chemSvg) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center p-1 text-slate-950 dark:text-slate-50 ${className}`}
        dangerouslySetInnerHTML={{ __html: chemSvg }}
      />
    );
  }

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
