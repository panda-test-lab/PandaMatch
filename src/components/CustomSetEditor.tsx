import React, { useState, useRef } from 'react';
import { CardPair, CardSet, CardContentType, CardProperty } from '../types/memory';
import { optimizeUploadedImage } from '../utils/storage';
import {
  Upload,
  Plus,
  Trash2,
  Save,
  Play,
  ArrowLeft,
  CheckCircle2,
  SlidersHorizontal,
  X,
  FlaskConical
} from 'lucide-react';
import { LatexRenderer } from './LatexRenderer';
import { ChemicalFormulaModal } from './ChemicalFormulaModal';

interface CustomSetEditorProps {
  initialSet?: CardSet | null;
  onSave: (savedSet: CardSet) => void;
  onCancel: () => void;
  onPlayDirectly: (set: CardSet) => void;
}

const COMMON_EMOJIS = [
  '⭐', '🌟', '💎', '🔥', '🌊', '🍀', '🎯', '🎸', '🎨', '🧩',
  '🚀', '🛸', '🛰️', '👑', '🦁', '🐬', '🦉', '🦊', '🐼', '🍕',
  '🍔', '🍣', '🍦', '🍩', '⚽', '🏀', '🏎️', '✈️', '⛵', '🏰'
];

export const CustomSetEditor: React.FC<CustomSetEditorProps> = ({
  initialSet,
  onSave,
  onCancel,
  onPlayDirectly,
}) => {
  const [title, setTitle] = useState(initialSet?.title || 'Mein Kartenset');
  const [category, setCategory] = useState(initialSet?.category || 'Eigene Sammlung');
  const description =
    initialSet?.description || 'Eigenes Kartenset.';
  const [icon, setIcon] = useState(initialSet?.icon || '🎴');

  // Available properties for multi-attribute matching (Requirement 3)
  const [availableProperties, setAvailableProperties] = useState<{ key: string; label: string }[]>(() => {
    if (initialSet?.availableProperties && initialSet.availableProperties.length >= 2) {
      return initialSet.availableProperties;
    }
    return [
      { key: 'prop_1', label: '1. Vorderseite' },
      { key: 'prop_2', label: '2. Rückseite' },
    ];
  });

  // Pairs state
  const [pairs, setPairs] = useState<CardPair[]>(() => initialSet?.pairs || []);

  const [isDraggingOverZone, setIsDraggingOverZone] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [modalTarget, setModalTarget] = useState<{ pairIdx: number; propKey: string } | null>(null);

  // Apply templates
  const applyPharmaTemplate = () => {
    setCategory('Pharmazie & Chemie');
    setIcon('⚗️');
    setAvailableProperties([
      { key: 'structure', label: '1. Strukturformel' },
      { key: 'name', label: '2. Wirkstoffname' },
      { key: 'class', label: '3. Wirkstoffklasse' },
      { key: 'indication', label: '4. Indikation & Wirkung' },
    ]);
  };

  const applyBotanyTemplate = () => {
    setCategory('Botanik & Phytotherapie');
    setIcon('🌿');
    setAvailableProperties([
      { key: 'image', label: '1. Pflanzenabbildung' },
      { key: 'name', label: '2. Deutscher Name' },
      { key: 'botanical', label: '3. Botanischer Name' },
      { key: 'indication', label: '4. Heilwirkung' },
    ]);
  };

  const applyClassicTemplate = () => {
    setAvailableProperties([
      { key: 'prop_1', label: '1. Vorderseite' },
      { key: 'prop_2', label: '2. Rückseite' },
    ]);
  };

  const handleAddProperty = () => {
    if (availableProperties.length >= 6) return;
    const nextNum = availableProperties.length + 1;
    const newKey = `prop_${Date.now().toString(36).substring(2, 6)}`;
    setAvailableProperties((prev) => [
      ...prev,
      { key: newKey, label: `${nextNum}. Neue Eigenschaft` },
    ]);
  };

  const handleRemoveProperty = (keyToRemove: string) => {
    if (availableProperties.length <= 2) return; // Min 2 properties
    setAvailableProperties((prev) => prev.filter((p) => p.key !== keyToRemove));
  };

  const handleRenameProperty = (key: string, newLabel: string) => {
    setAvailableProperties((prev) =>
      prev.map((p) => (p.key === key ? { ...p, label: newLabel } : p))
    );
  };

  // Process dropped/selected files
  const handleFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    try {
      const optimizedImages: { dataUrl: string; name: string }[] = [];
      for (const file of imageFiles) {
        const dataUrl = await optimizeUploadedImage(file, 260);
        const cleanName = file.name.replace(/\.[^/.]+$/, '').slice(0, 24);
        optimizedImages.push({ dataUrl, name: cleanName });
      }

      const pKey1 = availableProperties[0]?.key || 'prop_1';
      const pKey2 = availableProperties[1]?.key || 'prop_2';

      const newPairs: CardPair[] = optimizedImages.map((img, idx) => ({
        id: `custom_pair_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
        title: img.name || `Konzept ${pairs.length + idx + 1}`,
        cardA: { content: img.dataUrl, type: 'image', label: img.name },
        cardB: { content: img.dataUrl, type: 'image', label: img.name },
        properties: {
          [pKey1]: { id: `${idx}_1`, key: pKey1, label: availableProperties[0]?.label || 'Eigenschaft 1', content: img.dataUrl, type: 'image' },
          [pKey2]: { id: `${idx}_2`, key: pKey2, label: availableProperties[1]?.label || 'Eigenschaft 2', content: img.name, type: 'text' },
        },
      }));
      setPairs((prev) => [...prev, ...newPairs]);
    } catch (err) {
      console.error('Error processing images:', err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverZone(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Add empty pair / concept
  const handleAddEmptyPair = () => {
    const randomEmoji = COMMON_EMOJIS[Math.floor(Math.random() * COMMON_EMOJIS.length)];
    const newPairProps: Record<string, CardProperty> = {};
    availableProperties.forEach((p, idx) => {
      newPairProps[p.key] = {
        id: `prop_${Date.now()}_${idx}`,
        key: p.key,
        label: p.label,
        content: idx === 0 ? randomEmoji : `Eigenschaft ${idx + 1}`,
        type: idx === 0 ? 'emoji' : 'text',
      };
    });

    const newPair: CardPair = {
      id: `pair_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      title: `Konzept ${pairs.length + 1}`,
      cardA: { content: randomEmoji, type: 'emoji', label: availableProperties[0]?.label || 'Vorderseite' },
      cardB: { content: `Eigenschaft 2`, type: 'text', label: availableProperties[1]?.label || 'Rückseite' },
      properties: newPairProps,
    };
    setPairs((prev) => [...prev, newPair]);
  };

  const handleRemovePair = (index: number) => {
    setPairs((prev) => prev.filter((_, i) => i !== index));
  };

  // Update a specific property of a pair
  const handleUpdateProperty = (
    pairIndex: number,
    propKey: string,
    updates: Partial<CardProperty>
  ) => {
    setPairs((prev) => {
      const copy = [...prev];
      const targetPair = { ...copy[pairIndex] };
      const currentProps = { ...(targetPair.properties || {}) };

      const existingProp = currentProps[propKey] || {
        id: `${targetPair.id}_${propKey}`,
        key: propKey,
        label: propKey,
        content: '',
        type: 'text' as CardContentType,
      };

      currentProps[propKey] = { ...existingProp, ...updates };
      targetPair.properties = currentProps;

      // Keep cardA and cardB synchronized with first two properties
      const p1Key = availableProperties[0]?.key;
      const p2Key = availableProperties[1]?.key;
      if (propKey === p1Key) {
        targetPair.cardA = {
          content: currentProps[propKey].content,
          type: currentProps[propKey].type,
          label: currentProps[propKey].label,
        };
      }
      if (propKey === p2Key) {
        targetPair.cardB = {
          content: currentProps[propKey].content,
          type: currentProps[propKey].type,
          label: currentProps[propKey].label,
        };
      }

      copy[pairIndex] = targetPair;
      return copy;
    });
  };

  // Drag & drop image directly onto a specific property slot
  const handleDropOnSlot = async (e: React.DragEvent, pairIndex: number, propKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        try {
          const dataUrl = await optimizeUploadedImage(file, 260);
          handleUpdateProperty(pairIndex, propKey, {
            content: dataUrl,
            type: 'image',
          });
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  // Build final CardSet object
  const buildCurrentSet = (): CardSet => {
    // Ensure all pairs have valid cardA and cardB and properties
    const formattedPairs = pairs.map((pair) => {
      const pKey1 = availableProperties[0]?.key || 'prop_1';
      const pKey2 = availableProperties[1]?.key || 'prop_2';

      const p1 = pair.properties?.[pKey1] || { content: pair.cardA.content, type: pair.cardA.type, label: pair.cardA.label };
      const p2 = pair.properties?.[pKey2] || { content: pair.cardB.content, type: pair.cardB.type, label: pair.cardB.label };

      return {
        ...pair,
        cardA: {
          content: p1.content,
          type: p1.type,
          label: p1.label,
        },
        cardB: {
          content: p2.content,
          type: p2.type,
          label: p2.label,
        },
        properties: pair.properties,
      };
    });

    return {
      id: initialSet?.id || `custom_set_${Date.now()}`,
      title: title.trim() || 'Unbenanntes Set',
      description: description.trim(),
      category: category.trim() || 'Pharmazie & Naturwissenschaften',
      icon: icon.trim() || '🔬',
      color: 'emerald',
      pairs: formattedPairs,
      availableProperties,
      isCustom: true,
      createdAt: initialSet?.createdAt || new Date().toISOString(),
    };
  };

  const handleSave = () => {
    const currentSet = buildCurrentSet();
    onSave(currentSet);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2500);
  };

  const handlePlayNow = () => {
    const currentSet = buildCurrentSet();
    onSave(currentSet);
    onPlayDirectly(currentSet);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
      {/* Top Header / Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            aria-label="Zurück zur Übersicht"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {initialSet ? 'Kartenset bearbeiten' : 'Eigenes Multi-Eigenschaften-Set erstellen'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Definiere 2, 3 oder 4 Eigenschaften pro Karte (z.B. Strukturformel, Wirkstoffname, Klasse, Indikation)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={pairs.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>Speichern</span>
          </button>

          <button
            onClick={handlePlayNow}
            disabled={pairs.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Sofort Testen</span>
          </button>
        </div>
      </div>

      {/* Save Success Banner */}
      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-400 text-emerald-900 dark:text-emerald-100 text-xs font-bold flex items-center gap-2 shadow-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Kartenset wurde erfolgreich lokal gespeichert!</span>
        </div>
      )}

      {/* Set Details Form */}
      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 mb-1">
            Name des Kartensets
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 mb-1">
            Kategorie / Fachgebiet
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 mb-1">
            Icon / Symbol
          </label>
          <input
            type="text"
            value={icon}
            onChange={(e) => setIcon(e.target.value.slice(0, 3))}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>
      </div>

      {/* Multi-Property Configuration Section (Requirement 3) */}
      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-sm flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-emerald-500" />
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                Karteneigenschaften konfigurieren ({availableProperties.length} Eigenschaften)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Lerne mit 2 bis 4 Karten pro Zug (z.B. Formel + Name + Klasse + Indikation)
              </p>
            </div>
          </div>

          {/* Quick Preset Template Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold">Vorlagen:</span>
            <button
              type="button"
              onClick={applyPharmaTemplate}
              className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-300 font-bold transition-colors cursor-pointer"
            >
              💊 Pharmazie (4)
            </button>
            <button
              type="button"
              onClick={applyBotanyTemplate}
              className="px-2.5 py-1 rounded-lg bg-teal-100 dark:bg-teal-950/50 hover:bg-teal-200 dark:hover:bg-teal-900/60 border border-teal-300 dark:border-teal-800 text-teal-950 dark:text-teal-300 font-bold transition-colors cursor-pointer"
            >
              🌿 Botanik (4)
            </button>
            <button
              type="button"
              onClick={applyClassicTemplate}
              className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-900 hover:bg-slate-300 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 font-bold transition-colors cursor-pointer"
            >
              🎴 Klassisch (2)
            </button>
            <button
              type="button"
              onClick={handleAddProperty}
              disabled={availableProperties.length >= 6}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer shadow-xs"
            >
              <Plus className="w-3 h-3" />
              <span>Eigenschaft</span>
            </button>
          </div>
        </div>

        {/* Property Badges List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
          {availableProperties.map((p, pIdx) => (
            <div
              key={p.key}
              className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
            >
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {pIdx + 1}
              </span>
              <input
                type="text"
                value={p.label}
                onChange={(e) => handleRenameProperty(p.key, e.target.value)}
                className="flex-1 text-xs font-bold text-slate-950 dark:text-slate-100 bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1"
              />
              {availableProperties.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveProperty(p.key)}
                  className="p-1 text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                  title="Eigenschaft entfernen"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Global Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOverZone(true);
        }}
        onDragLeave={() => setIsDraggingOverZone(false)}
        onDrop={handleDrop}
        className={`relative w-full rounded-3xl border-2 border-dashed p-6 sm:p-8 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
          isDraggingOverZone
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-800 hover:border-emerald-500 bg-slate-50/70 dark:bg-slate-950'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />

        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 shadow-xs">
          <Upload className="w-6 h-6" />
        </div>

        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
          Bilddateien hier ablegen (Drag & Drop)
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md">
          Bilder (Strukturformeln, Pflanzenfotos, Diagramme) werden automatisch skaliert.
        </p>
      </div>

      {/* Concept Items List Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Konzepte & Kartenpaare ({pairs.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Fülle für jedes Konzept die abzufragenden Eigenschaften aus oder ziehe Bilder direkt auf die Karten.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddEmptyPair}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-500" />
          <span>Konzept hinzufügen</span>
        </button>
      </div>

      {/* Concept Items Rows */}
      <div className="space-y-4">
        {pairs.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
            Dieses Set enthält noch keine Konzepte. Füge ein Konzept hinzu oder ziehe Bilder in den Bildbereich, um zu beginnen.
          </p>
        )}
        {pairs.map((pair, idx) => (
          <div
            key={pair.id}
            className="p-4 rounded-3xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-sm flex flex-col gap-3"
          >
            {/* Concept Title & Actions */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="w-6 text-center font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                  #{idx + 1}
                </span>
                <input
                  type="text"
                  value={pair.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPairs((prev) => {
                      const c = [...prev];
                      c[idx] = { ...c[idx], title: val };
                      return c;
                    });
                  }}
                  placeholder="Titel des Konzepts (z.B. Acetylsalicylsäure)"
                  className="text-sm font-extrabold text-slate-950 dark:text-white bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 min-w-[220px] placeholder:text-slate-600 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleRemovePair(idx)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Konzept löschen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Properties Grid */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-${Math.min(4, availableProperties.length)} gap-3`}>
              {availableProperties.map((pMeta) => {
                const prop = pair.properties?.[pMeta.key] || {
                  id: `${pair.id}_${pMeta.key}`,
                  key: pMeta.key,
                  label: pMeta.label,
                  content: '',
                  type: 'text' as CardContentType,
                };

                return (
                  <div
                    key={pMeta.key}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnSlot(e, idx, pMeta.key)}
                    className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 flex flex-col gap-2 relative group"
                  >
                    <div className="text-[11px] font-bold text-emerald-950 dark:text-emerald-300 flex items-center justify-between">
                      <span className="truncate">{pMeta.label}</span>
                      <button
                        type="button"
                        onClick={() => setModalTarget({ pairIdx: idx, propKey: pMeta.key })}
                        className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-950 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors cursor-pointer shadow-xs"
                        title="Formel-Assistent für Strukturformeln, LaTeX oder Screenshots öffnen"
                      >
                        <FlaskConical className="w-3 h-3" />
                        <span>Formel-Assistent</span>
                      </button>
                    </div>

                    {/* Preview Box */}
                    <div className="w-full aspect-[4/3] rounded-xl bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 flex items-center justify-center p-2 overflow-hidden shadow-inner text-center">
                      {prop.type === 'latex' ? (
                        <div className="w-full flex items-center justify-center p-1 text-slate-950 dark:text-white">
                          <LatexRenderer latex={prop.content || '\\text{LaTeX-Vorschau}'} displayMode={true} className="text-sm sm:text-base max-w-full" />
                        </div>
                      ) : prop.type === 'svg' ? (
                        <div
                          className="w-full h-full flex items-center justify-center p-1 text-slate-950 dark:text-white"
                          dangerouslySetInnerHTML={{ __html: prop.content }}
                        />
                      ) : prop.type === 'image' ? (
                        <img
                          src={prop.content}
                          alt={pMeta.label}
                          className="w-full h-full object-contain"
                        />
                      ) : prop.type === 'emoji' ? (
                        <span className="text-3xl select-none">{prop.content}</span>
                      ) : (
                        <span className="text-xs sm:text-sm font-extrabold text-slate-950 dark:text-white line-clamp-3">
                          {prop.content || 'Leer'}
                        </span>
                      )}
                    </div>

                    {/* Format / Type Switcher */}
                    <div className="flex items-center justify-between gap-1 p-0.5 rounded-lg bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-[10px] font-bold">
                      {(['text', 'latex', 'emoji', 'image'] as CardContentType[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleUpdateProperty(idx, pMeta.key, { type: t })}
                          className={`flex-1 py-0.5 rounded text-center transition-colors cursor-pointer ${
                            prop.type === t
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                          }`}
                        >
                          {t === 'latex' ? 'LaTeX' : t === 'text' ? 'Text' : t === 'emoji' ? 'Emoji' : 'Bild'}
                        </button>
                      ))}
                    </div>

                    {/* Quick LaTeX Chemical Snippets */}
                    {prop.type === 'latex' && (
                      <div className="flex flex-wrap items-center gap-1 py-0.5">
                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">Schnellbausteine:</span>
                        {[
                          { label: 'C_6H_6', snippet: '\\mathrm{C_6H_6}' },
                          { label: '-COOH', snippet: '\\mathrm{-COOH}' },
                          { label: '-OH', snippet: '\\mathrm{-OH}' },
                          { label: '-NH_2', snippet: '\\mathrm{-NH_2}' },
                          { label: '_2', snippet: '_2' },
                          { label: '→', snippet: '\\rightarrow ' },
                        ].map((s) => (
                          <button
                            key={s.label}
                            type="button"
                            onClick={() =>
                              handleUpdateProperty(idx, pMeta.key, {
                                content: prop.content ? `${prop.content}${s.snippet}` : s.snippet,
                              })
                            }
                            className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-900 hover:bg-slate-300 dark:hover:bg-slate-800 text-[10px] font-mono text-slate-950 dark:text-slate-200 border border-slate-300 dark:border-slate-800 cursor-pointer"
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Inputs with Non-white background and High Contrast */}
                    <input
                      type="text"
                      value={prop.content}
                      onChange={(e) => {
                        const val = e.target.value;
                        let inferredType = prop.type;
                        if (val.startsWith('data:image')) inferredType = 'image';
                        else if (val.includes('\\') || val.includes('_') || val.includes('^')) inferredType = 'latex';
                        handleUpdateProperty(idx, pMeta.key, {
                          content: val,
                          type: inferredType,
                        });
                      }}
                      placeholder={
                        prop.type === 'latex'
                          ? 'LaTeX z.B. \\mathrm{C_9H_8O_4}'
                          : 'Inhalt (Text, Begriff, Emoji)'
                      }
                      className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950 text-slate-950 dark:text-slate-100 placeholder:text-slate-600 dark:placeholder:text-slate-400 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                );
              })}
            </div>

          </div>
        ))}
      </div>

      {/* Chemical Formula / LaTeX / Screenshot Modal */}
      {modalTarget && (
        <ChemicalFormulaModal
          isOpen={true}
          onClose={() => setModalTarget(null)}
          initialContent={
            pairs[modalTarget.pairIdx]?.properties?.[modalTarget.propKey]?.content || ''
          }
          initialLabel={
            pairs[modalTarget.pairIdx]?.properties?.[modalTarget.propKey]?.label || ''
          }
          onApply={(data) => {
            handleUpdateProperty(modalTarget.pairIdx, modalTarget.propKey, {
              content: data.content,
              type: data.type,
            });
            setModalTarget(null);
          }}
        />
      )}
    </div>
  );
};
