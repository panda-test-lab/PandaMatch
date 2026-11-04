import React, { useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  LayoutGrid,
  Eye,
  Brain,
  Layers,
  CheckCircle2,
  Heart
} from 'lucide-react';
import { KoFiButton } from './KoFiButton';

interface InfoTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourStep {
  title: string;
  badge: string;
  icon: React.ReactNode;
  iconBg: string;
  description: string;
  highlights: { title: string; desc: string; icon?: React.ReactNode }[];
  tip?: string;
  showKoFiButton?: boolean;
}

export const InfoTourModal: React.FC<InfoTourModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps: TourStep[] = [
    {
      title: 'Willkommen bei PandaMatch',
      badge: 'Lernen. Zuordnen. Verstehen.',
      icon: <Sparkles className="w-6 h-6" />,
      iconBg: 'bg-emerald-600 text-white',
      description:
        'Pauken war gestern! Bei PandaMatch fütterst du dein Gehirn spielerisch mit echten Fakten, Begriffen und Formen – rasant, frech und mit jeder Menge Spielspaß.',
      highlights: [
        {
          title: 'Ein Aspekt pro Karte',
          desc: 'Jede Memory-Karte bildet exakt einen Aspekt ab (z. B. Formel, Begriff oder Bild), glasklar und ohne ablenkenden Ballast.',
        },
        {
          title: 'Formel- & Grafik-Unterstützung',
          desc: 'Darstellung von Formeln, Symbolen und Bildern in gestochen scharfer Qualität.',
        },
        {
          title: 'Intelligentes Mitdenken',
          desc: 'Das Spiel merkt sich deine Treffer: Inhalte, bei denen du noch unsicher bist, tauchen automatisch öfter auf.',
        },
      ],
      tip: 'Tipp: Klicke dich durch die nächsten Schritte, um alle Spielmodi kennenzulernen!',
    },
    {
      title: 'Klassischer Modus: Original & Erweitert',
      badge: 'Verdecktes Memory',
      icon: <LayoutGrid className="w-6 h-6" />,
      iconBg: 'bg-indigo-600 text-white',
      description:
        'Der klassische Modus fordert dein Gedächtnis und dein Wissen über Zusammenhänge:',
      highlights: [
        {
          title: 'Original (Paar-Memory)',
          desc: 'Genau 2 beliebige Eigenschaften werden gewählt (z. B. Strukturformel und Trivialname). Du deckst 2 Karten pro Zug auf.',
        },
        {
          title: 'Erweitert (Multi-Karten-Memory)',
          desc: 'Du kannst 3 bis hin zu ALLEN gemeinsamen Eigenschaften abfragen! Pro Zug deckst du alle zusammengehörigen Eigenschaften eines Konzepts auf.',
        },
        {
          title: 'Intelligente Farbkodierung (Rückseite & Vorderseite)',
          desc: 'Im erweiterten Modus haben Karten je nach Eigenschaftstyp farbige Rückseiten und Vorderseiten. So weißt du sofort, welcher Eigenschaftstyp noch zur Komplettierung fehlt.',
        },
      ],
      tip: 'Im Einzelspieler-Modus oder zu zweit im Duell spielbar!',
    },
    {
      title: 'Offener Lernmodus',
      badge: 'Stressfreies Verknüpfen',
      icon: <Eye className="w-6 h-6" />,
      iconBg: 'bg-cyan-600 text-white',
      description:
        'Im offenen Lernmodus liegen alle Karten des gewählten Sets aufgedeckt auf dem Spielbrett:',
      highlights: [
        {
          title: 'Direkter visueller Überblick',
          desc: 'Ideal zum ersten Kennenlernen neuer Substanzklassen oder komplexer Reaktionsmechanismen.',
        },
        {
          title: 'Reine Zuordnung ohne Suchaufwand',
          desc: 'Finde die zueinander passenden Eigenschaften (z. B. 3er- oder 4er-Kombinationen) ohne Memory-Gedächtnisbarriere.',
        },
        {
          title: 'Sofortiges Feedback & Zusatzinfos',
          desc: 'Nach jeder richtigen Zuordnung erfährst du Details und hinterlegte Begleitinformationen zum Konzept.',
        },
      ],
    },
    {
      title: 'Selbstabfrage (Active Recall) & Zeichenmodus',
      badge: 'Aktives Üben & Prüfen',
      icon: <Brain className="w-6 h-6" />,
      iconBg: 'bg-purple-600 text-white',
      description:
        'Zwei spezialisierte Trainingsmodi für maximale Behaltensleistung vor Klausuren:',
      highlights: [
        {
          title: 'Selbstabfrage (Active Recall)',
          desc: 'Spaced-Repetition-Karteikartensystem. Eine Eigenschaft wird vorgegeben, du rufst die restlichen im Kopf ab und bewertest deine Sicherheit (Nochmal, Schwer, Gut, Perfekt).',
        },
        {
          title: 'Zeichenmodus (Skizzenbrett)',
          desc: 'Zeichne chemische Strukturformeln, Isomere oder Mechanismen eigenhändig auf der interaktiven Skizzenleinwand und vergleiche deine Zeichnung mit der Lösung.',
        },
      ],
      tip: 'Vor jeder Runde wählst du direkt das gewünschte Kartenset aus.',
    },
    {
      title: 'Kartensets, LaTeX-Assistent & Im-/Export',
      badge: 'Vollständige Flexibilität',
      icon: <Layers className="w-6 h-6" />,
      iconBg: 'bg-emerald-600 text-white',
      description:
        'Verwalte und erstelle deine eigenen Kartensets ganz nach deinen Bedürfnissen:',
      highlights: [
        {
          title: 'Frei definierbare Eigenschaften',
          desc: 'Benenne eigene Eigenschaftsspalten (z. B. Struktur, IUPAC, Indikation, CAS-Nr.) und pflege optional "Weitere Informationen" ein.',
        },
        {
          title: 'Integrierter LaTeX- & chemfig-Editor',
          desc: 'Nutze Vorlagen für Benzolringe, funktionelle Gruppen und Pfeile mit Live-Vorschau.',
        },
        {
          title: 'Im- und Export',
          desc: 'Exportiere Sets als standardisierte JSON-Dateien und teile sie mit deinen Kommilitonen oder sichere deinen Lernstand.',
        },
      ],
      tip: 'Du kannst jederzeit im Hauptmenü oder in der Kopfzeile über "Kartensets" neue Sets anlegen oder bestehende bearbeiten.',
    },
    {
      title: 'PandaMatch mit einem Kaffee unterstützen ☕🐼',
      badge: 'Support & Dankeschön',
      icon: <Heart className="w-6 h-6 fill-current text-rose-500" />,
      iconBg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700',
      description:
        'Wusstest du? Ein Großer Panda kaut täglich bis zu 14 Stunden auf Bambus herum – und Entwickler trinken fast genauso viel Kaffee, um Strukturformeln, chemfig-Befehle und Spaced-Repetition-Logik fehlerfrei in eine App zu packen! 😉',
      highlights: [
        {
          title: '100% Kostenlos & Werbefrei',
          desc: 'PandaMatch ist und bleibt frei zugänglich, damit du dich ohne Ablenkungen voll auf deinen Lernerfolg konzentrieren kannst.',
        },
        {
          title: 'Balsam für die Panda-Tastatur',
          desc: 'Wenn dir die App beim Verstehen, Lernen oder Bestehen deiner Prüfungen hilft, freue ich mich riesig über eine kleine Geste auf Ko-fi.',
        },
        {
          title: 'Zukunft & Neue Kartensets',
          desc: 'Jede Tasse Kaffee fließt direkt in die Pflege der Fachdatenbanken, neue Sets und weitere smarte Lernfeatures.',
        },
      ],
      tip: 'Absolut freiwillig – kein Abo, kein Zwang! Klicke unten einfach auf den Button, wenn du mich unterstützen möchtest.',
      showKoFiButton: true,
    },
  ];

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const handleFinish = () => {
    localStorage.setItem('pandamatch_tour_seen', 'true');
    onClose();
  };

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs ${step.iconBg}`}>
              {step.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                  {step.title}
                </h2>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                {step.badge} · Schritt {currentStep + 1} von {steps.length}
              </span>
            </div>
          </div>

          <button
            onClick={handleFinish}
            aria-label="Tour schließen"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 text-xs sm:text-sm">
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            {step.description}
          </p>

          <div className="space-y-2.5">
            {step.highlights.map((h, i) => (
              <div
                key={i}
                className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-start gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-300 dark:border-emerald-800 font-bold text-xs">
                  ✓
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                    {h.title}
                  </h4>
                  <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5 leading-snug">
                    {h.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {step.showKoFiButton && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-2 border-amber-400 dark:border-amber-600/80 flex flex-col items-center text-center gap-3 shadow-md my-1 animate-fade-in">
              <span className="text-2xl select-none">☕🐼</span>
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                Gefällt dir PandaMatch?
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm">
                Ein virtueller Kaffee hilft mir, die Serverkosten zu tragen und die Plattform dauerhaft kostenlos für Studierende und Lernende weiterzuentwickeln.
              </p>
              <KoFiButton variant="standard" />
            </div>
          )}

          {step.tip && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <span className="font-bold">💡 Hinweis:</span>
              <span>{step.tip}</span>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/80 flex items-center justify-between gap-3">
          {/* Step Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentStep === idx
                    ? 'w-6 bg-emerald-600'
                    : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                }`}
                title={`Schritt ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Zurück</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <span>{isLast ? 'Tour abschließen' : 'Weiter'}</span>
              {!isLast ? <ChevronRight className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
