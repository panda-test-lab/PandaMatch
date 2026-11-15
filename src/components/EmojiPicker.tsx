import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { EMOJI_OPTIONS } from '../data/emojiOptions';

const EMOJI_KEYWORDS: Record<string, string> = {
  '⭐': 'stern himmel weltall nacht', '🌟': 'funkeln stern glitzer',
  '💎': 'diamant edelstein schmuck', '🔥': 'feuer hitze energie',
  '🌊': 'welle meer wasser ozean', '🍀': 'klee glueck glück pflanze',
  '🎯': 'ziel fokus', '🎸': 'gitarre musik instrument', '🎨': 'kunst palette malen',
  '🧩': 'puzzle spiel logik', '🚀': 'rakete weltall weltraum',
  '🛸': 'ufo weltall alien', '🛰️': 'satellit weltraum',
  '👑': 'krone koenig könig', '🦁': 'loewe löwe tier wildnis',
  '🐬': 'delfin tier meer ozean', '🦉': 'eule vogel nacht',
  '🦊': 'fuchs tier wald', '🐼': 'panda tier baer bär',
  '🍕': 'pizza essen lebensmittel', '🍔': 'burger essen lebensmittel',
  '🍣': 'sushi essen japan', '🍦': 'eis dessert essen',
  '🍩': 'donut dessert backen', '⚽': 'fussball fußball sport ball',
  '🏀': 'basketball sport ball', '🏎️': 'rennen sport auto',
  '✈️': 'flugzeug reise transport', '⛵': 'boot reise segeln',
  '🏰': 'burg schloss fantasy', '🧪': 'chemie labor experiment',
  '🧬': 'biologie dna genetik', '🌍': 'erde welt planet',
};

function normalizeSearch(value: string): string {
  return value.toLocaleLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  label?: string;
}

export function EmojiPicker({ value, onChange, label = 'Emoji' }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchTerms = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  const filteredEmojis = EMOJI_OPTIONS.filter(({ emoji, category, keywords }) => {
    const searchable = normalizeSearch(
      `${emoji} ${category} ${keywords} ${EMOJI_KEYWORDS[emoji] || ''}`,
    );
    return searchTerms.every((term) => searchable.includes(term));
  });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
      >
        <span className="flex items-center gap-2"><span className="text-xl">{value || '😀'}</span> {label} auswählen</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-300 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Stichwort oder Thema suchen"
              aria-label={`${label} nach Stichwort oder Thema suchen`}
              className="w-full rounded-lg border border-slate-300 bg-slate-100 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <div className="mt-2 grid max-h-48 grid-cols-6 gap-1.5 overflow-y-auto" role="listbox" aria-label={`${label} auswählen`}>
            {filteredEmojis.map(({ emoji, category }, index) => (
              <button
                key={`${emoji}-${index}`}
                type="button"
                role="option"
                aria-label={`${emoji}, ${category}`}
                aria-selected={value === emoji}
                onClick={() => {
                  onChange(emoji);
                  setIsOpen(false);
                }}
                className={`h-9 rounded-lg border text-xl transition-colors ${
                  value === emoji
                    ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-950/70'
                    : 'border-slate-300 bg-slate-100 hover:border-emerald-500 dark:border-slate-700 dark:bg-slate-950'
                }`}
              >
                {emoji}
              </button>
            ))}
            {filteredEmojis.length === 0 && (
              <p className="col-span-6 py-3 text-center text-xs text-slate-500">Keine passenden Emojis gefunden.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
