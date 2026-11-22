import React, { useState, useRef } from 'react';
import { CardPair, CardSet, CardContentType, CardProperty, SetImageAsset } from '../types/memory';
import { readUploadedImage } from '../utils/storage';
import { reportAppError } from '../utils/errorReporting';
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
  Sigma
} from 'lucide-react';
import { LatexRenderer } from './LatexRenderer';
import { FormulaAndImageModal } from './FormulaAndImageModal';
import { EmojiPicker } from './EmojiPicker';
import { EMOJI_OPTIONS } from '../data/emojiOptions';

interface CustomSetEditorProps {
  initialSet?: CardSet | null;
  onSave: (savedSet: CardSet) => void;
  onCancel: () => void;
  onPlayDirectly: (set: CardSet) => void;
}

interface SavedSetTemplate {
  name: string;
  category: string;
  subcategory: string;
  description: string;
  author: string;
  icon: string;
  availableProperties: { key: string; label: string }[];
}

const SET_TEMPLATES_KEY = 'pandamatch_set_templates';

const loadSetTemplates = (): SavedSetTemplate[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SET_TEMPLATES_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.name === 'string') : [];
  } catch {
    return [];
  }
};

const isImageFile = (file: File) =>
  file.type.startsWith('image/') || /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(file.name);

const normalizeImageName = (name: string, fallback: string) =>
  name.replace(/\.[^/.]+$/, '').trim().slice(0, 80) || fallback;

const createImageAsset = (content: string, name: string, fallback: string): SetImageAsset => ({
  id: `image_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  name: normalizeImageName(name, fallback),
  content,
  type: 'image',
});

function prepareInitialImageData(
  set: CardSet | null | undefined,
  availableProperties: { key: string; label: string }[],
) {
  const imageAssets = [...(set?.imageAssets || [])];
  const assetsByContent = new Map(imageAssets.map((asset) => [asset.content, asset]));

  const findOrCreateAsset = (content: string, name: string) => {
    if (!content.startsWith('data:image/')) return undefined;
    const existing = assetsByContent.get(content);
    if (existing) return existing;

    const asset = createImageAsset(content, name, `Bild ${imageAssets.length + 1}`);
    imageAssets.push(asset);
    assetsByContent.set(content, asset);
    return asset;
  };

  const pairs = (set?.pairs || []).map((pair) => {
    const properties = { ...(pair.properties || {}) };

    Object.entries(properties).forEach(([key, property]) => {
      if (property.type !== 'image') return;
      const asset = findOrCreateAsset(property.content, property.label || pair.title);
      if (asset) properties[key] = { ...property, imageAssetId: asset.id };
    });

    availableProperties.forEach((metadata, index) => {
      if (properties[metadata.key]) return;
      const legacyProperty = index === 0 ? pair.cardA : index === 1 ? pair.cardB : undefined;
      if (legacyProperty?.type !== 'image') return;
      const asset = findOrCreateAsset(legacyProperty.content, legacyProperty.label || pair.title);
      if (!asset) return;
      properties[metadata.key] = {
        id: `${pair.id}_${metadata.key}`,
        key: metadata.key,
        label: legacyProperty.label || metadata.label,
        content: legacyProperty.content,
        type: 'image',
        imageAssetId: asset.id,
      };
    });

    return {
      ...pair,
      properties: Object.keys(properties).length > 0 ? properties : pair.properties,
    };
  });

  return { imageAssets, pairs };
}

export const CustomSetEditor: React.FC<CustomSetEditorProps> = ({
  initialSet,
  onSave,
  onCancel,
  onPlayDirectly,
}) => {
  const [title, setTitle] = useState(initialSet?.title || 'Mein Kartenset');
  const [category, setCategory] = useState(initialSet?.category || 'Eigene Sammlung');
  const [subcategory, setSubcategory] = useState(initialSet?.subcategory || '');
  const [description, setDescription] = useState(initialSet?.description || '');
  const [author, setAuthor] = useState(initialSet?.author || '');
  const [icon, setIcon] = useState(initialSet?.icon || '🎴');

  // Available properties for multi-attribute matching (Requirement 3)
  const initialAvailableProperties = initialSet?.availableProperties && initialSet.availableProperties.length >= 1
    ? initialSet.availableProperties
    : [
        { key: 'prop_1', label: '1. Vorderseite' },
        { key: 'prop_2', label: '2. Rückseite' },
      ];
  const [availableProperties, setAvailableProperties] = useState(initialAvailableProperties);
  const [savedTemplates, setSavedTemplates] = useState<SavedSetTemplate[]>(loadSetTemplates);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [selectedTemplateName, setSelectedTemplateName] = useState(() => loadSetTemplates()[0]?.name || '');

  const [initialImageData] = useState(() => prepareInitialImageData(initialSet, initialAvailableProperties));
  const [imageAssets, setImageAssets] = useState<SetImageAsset[]>(initialImageData.imageAssets);
  const [pairs, setPairs] = useState<CardPair[]>(initialImageData.pairs);

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
    const nextNum = availableProperties.length + 1;
    const newKey = `prop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    setAvailableProperties((prev) => [
      ...prev,
      { key: newKey, label: `${nextNum}. Neue Eigenschaft` },
    ]);
  };

  const handleRemoveProperty = (keyToRemove: string) => {
    setAvailableProperties((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((p) => p.key !== keyToRemove);
    });
  };

  const handleRenameProperty = (key: string, newLabel: string) => {
    setAvailableProperties((prev) =>
      prev.map((p) => (p.key === key ? { ...p, label: newLabel } : p))
    );
    setPairs((prev) => prev.map((pair) => {
      if (!pair.properties?.[key]) return pair;
      return {
        ...pair,
        properties: {
          ...pair.properties,
          [key]: { ...pair.properties[key], label: newLabel },
        },
      };
    }));
  };

  const addImageAsset = (content: string, name: string) => {
    const existing = imageAssets.find((asset) => asset.content === content);
    if (existing) return existing;

    const asset = createImageAsset(content, name, `Bild ${imageAssets.length + 1}`);
    setImageAssets((prev) =>
      prev.some((item) => item.content === content) ? prev : [...prev, asset]
    );
    return asset;
  };

  const isImageAssetUsed = (assetId: string) =>
    pairs.some((pair) =>
      Object.values(pair.properties || {}).some((property) => property.imageAssetId === assetId)
    );

  const handleRenameImageAsset = (assetId: string, name: string) => {
    setImageAssets((prev) =>
      prev.map((asset) => (asset.id === assetId ? { ...asset, name } : asset))
    );
  };

  const handleRemoveImageAsset = (assetId: string) => {
    if (isImageAssetUsed(assetId)) return;
    setImageAssets((prev) => prev.filter((asset) => asset.id !== assetId));
  };

  // Process dropped/selected files
  const handleFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(isImageFile);
    if (imageFiles.length === 0) return;

    try {
      const uploadedImages: SetImageAsset[] = [];
      for (const file of imageFiles) {
        const dataUrl = await readUploadedImage(file);
        uploadedImages.push(
          createImageAsset(dataUrl, file.name, `Bild ${imageAssets.length + uploadedImages.length + 1}`)
        );
      }

      setImageAssets((prev) => {
        const existingContents = new Set(prev.map((asset) => asset.content));
        return [
          ...prev,
          ...uploadedImages.filter((asset) => {
            if (existingContents.has(asset.content)) return false;
            existingContents.add(asset.content);
            return true;
          }),
        ];
      });
    } catch (err) {
      reportAppError(err, 'Hochgeladene Bilder verarbeiten');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverZone(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Add empty pair / concept
  const handleAddEmptyPair = () => {
    const randomEmoji = EMOJI_OPTIONS[Math.floor(Math.random() * EMOJI_OPTIONS.length)].emoji;
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
      if (isImageFile(file)) {
        try {
          const dataUrl = await readUploadedImage(file);
          const asset = addImageAsset(dataUrl, file.name);
          handleUpdateProperty(pairIndex, propKey, {
            content: asset.content,
            type: 'image',
            imageAssetId: asset.id,
          });
        } catch (err) {
          reportAppError(err, 'Bild in Karteneigenschaft verarbeiten');
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
      author: author.trim(),
      category: category.trim() || 'Pharmazie & Naturwissenschaften',
      subcategory: subcategory.trim() || undefined,
      icon: icon.trim() || '🔬',
      color: 'emerald',
      pairs: formattedPairs,
      imageAssets,
      availableProperties,
      isCustom: true,
      createdAt: initialSet?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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

  const handleSaveTemplate = () => {
    const defaultName = `${category.trim() || 'Eigene Sammlung'} - ${title.trim() || 'Unbenanntes Set'}`;
    const selectedName = (saveTemplateName.trim() || defaultName).trim();
    if (!selectedName) return;
    const template: SavedSetTemplate = {
      name: selectedName,
      category: category.trim(),
      subcategory: subcategory.trim(),
      description: description.trim(),
      author: author.trim(),
      icon: icon.trim() || '🎴',
      availableProperties: availableProperties.map((property) => ({ ...property })),
    };
    const nextTemplates = [
      ...savedTemplates.filter((item) => item.name !== selectedName),
      template,
    ];
    localStorage.setItem(SET_TEMPLATES_KEY, JSON.stringify(nextTemplates));
    setSavedTemplates(nextTemplates);
    setSelectedTemplateName(selectedName);
    setSaveTemplateName('');
  };

  const handleApplySavedTemplate = (template: SavedSetTemplate) => {
    setCategory(template.category || 'Eigene Sammlung');
    setSubcategory(template.subcategory || '');
    setDescription(template.description || '');
    setAuthor(template.author || '');
    setIcon(template.icon || '🎴');
    setAvailableProperties(template.availableProperties.map((property) => ({ ...property })));
  };

  const handleApplySelectedTemplate = () => {
    const template = savedTemplates.find((item) => item.name === selectedTemplateName);
    if (template) handleApplySavedTemplate(template);
  };

  const handleDeleteSelectedTemplate = () => {
    const template = savedTemplates.find((item) => item.name === selectedTemplateName);
    if (!template) return;
    if (!window.confirm(`Vorlage „${template.name}“ wirklich löschen?`)) return;
    const nextTemplates = savedTemplates.filter((item) => item.name !== selectedTemplateName);
    localStorage.setItem(SET_TEMPLATES_KEY, JSON.stringify(nextTemplates));
    setSavedTemplates(nextTemplates);
    setSelectedTemplateName(nextTemplates[0]?.name || '');
  };

  return (
    <div
      className="w-full min-w-0 max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault();
      }}
      onDrop={handleDrop}
    >
      {/* Top Header / Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onCancel}
            aria-label="Zurück zur Übersicht"
            type="button"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white break-words">
              {initialSet ? 'Kartenset bearbeiten' : 'Eigenes Multi-Eigenschaften-Set erstellen'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 break-words">
              Definiere beliebig viele Eigenschaften pro Karte (z.B. Strukturformel, Wirkstoffname, Klasse, Indikation)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
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
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            Fachgebiet
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
            Teilgebiet (optional)
          </label>
          <input
            type="text"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            placeholder="z. B. Botanik oder Pharmakologie"
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 mb-1">
            Autor
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Name des Autors"
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 mb-1">
            Letzte Änderung (automatisch)
          </label>
          <p className="rounded-xl border border-slate-300 bg-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            {initialSet?.updatedAt && !Number.isNaN(Date.parse(initialSet.updatedAt))
              ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(initialSet.updatedAt))
              : 'Wird beim ersten Speichern gesetzt'}
          </p>
          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
            Wird bei jeder Speicherung automatisch aktualisiert.
          </p>
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 mb-1">
            Beschreibung des Sets
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Worum geht es in diesem Kartenset?"
            className="w-full resize-y px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
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
            aria-label="Kartenset-Icon"
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-950 text-slate-950 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
          <div className="mt-2">
            <EmojiPicker value={icon} onChange={setIcon} label="Icon" />
          </div>
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
                  Die Eigenschaften werden je Karte frei konfiguriert; für Memory und verwandte Modi werden Kartenplätze begrenzt dargestellt.
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
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Plus className="w-3 h-3" />
              <span>Eigenschaft</span>
            </button>
            <input
              type="text"
              value={saveTemplateName}
              onChange={(event) => setSaveTemplateName(event.target.value)}
              placeholder={`${category.trim() || 'Fachgebiet'} - ${title.trim() || 'Name des Kartensets'}`}
              aria-label="Name der zu speichernden Vorlage"
              className="min-w-32 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <button
              type="button"
              onClick={handleSaveTemplate}
              className="px-2.5 py-1 rounded-lg border border-violet-300 bg-violet-100 text-violet-950 font-bold hover:bg-violet-200 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300"
            >
              Als Vorlage speichern
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
              {availableProperties.length > 1 && (
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
        {savedTemplates.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Gespeicherte Vorlagen:</span>
            <select
              value={selectedTemplateName}
              onChange={(event) => setSelectedTemplateName(event.target.value)}
              aria-label="Gespeicherte Vorlage auswählen"
              className="min-w-48 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-900 outline-none focus:ring-1 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="">Vorlage auswählen…</option>
              {savedTemplates.map((template) => (
                <option key={template.name} value={template.name}>
                  {template.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleApplySelectedTemplate}
              disabled={!selectedTemplateName}
              title="Ausgewählte Vorlage anwenden"
              aria-label="Ausgewählte Vorlage anwenden"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CheckCircle2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleDeleteSelectedTemplate}
              disabled={!selectedTemplateName}
              title="Ausgewählte Vorlage löschen"
              aria-label="Ausgewählte Vorlage löschen"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white shadow-xs transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Global Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes('Files')) return;
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
          Bilder zur Set-Bildsammlung hinzufügen
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md">
          Bilder werden skaliert und können anschließend über ihren Namen einzelnen Karteneigenschaften zugeordnet werden.
        </p>
      </div>

      <section
        aria-label="Set-Bildsammlung"
        className="rounded-3xl border border-slate-300 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Bilder im Set ({imageAssets.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Vergib gut erkennbare Namen; verwendete Bilder lassen sich erst nach dem Entfernen aus den Karten löschen.
            </p>
          </div>
        </div>
        {imageAssets.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Noch keine Bilder hinzugefügt.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {imageAssets.map((asset) => {
              const isUsed = isImageAssetUsed(asset.id);
              return (
                <div
                  key={asset.id}
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950"
                >
                  <img
                    src={asset.content}
                    alt={asset.name || 'Bildvorschau'}
                    className="h-12 w-12 shrink-0 rounded-lg bg-slate-100 object-contain dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    value={asset.name}
                    onChange={(event) => handleRenameImageAsset(asset.id, event.target.value)}
                    aria-label={`Name für Bild ${asset.name || 'ohne Namen'}`}
                    placeholder="Lesbarer Bildname"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImageAsset(asset.id)}
                    disabled={isUsed}
                    title={isUsed ? 'Wird noch in einer Karte verwendet' : 'Bild aus dem Set entfernen'}
                    aria-label={`${asset.name || 'Bild'} aus dem Set entfernen`}
                    className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-rose-100 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-rose-950/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

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
            Dieses Set enthält noch keine Konzepte. Füge ein Konzept hinzu und ordne bei Bedarf Bilder aus der Set-Bildsammlung zu.
          </p>
        )}
        {pairs.map((pair, idx) => (
          <div
            key={pair.id}
            className="p-4 rounded-3xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-sm flex flex-col gap-3"
          >
            {/* Concept Title & Actions */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center gap-2 min-w-0 flex-1">
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
                  className="w-full min-w-0 text-sm font-extrabold text-slate-950 dark:text-white bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 placeholder:text-slate-600 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                      <span className="min-w-0 flex-1 break-words">{pMeta.label}</span>
                      <button
                        type="button"
                        onClick={() => setModalTarget({ pairIdx: idx, propKey: pMeta.key })}
                        className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-950 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors cursor-pointer shadow-xs shrink-0"
                        title="Mathe-Formel oder Grafik einfügen"
                      >
                        <Sigma className="w-3 h-3" />
                        <span>Formel-Assistent</span>
                      </button>
                    </div>

                    {/* Preview Box */}
                    <div className="custom-set-preview w-full min-h-28 sm:min-h-36 aspect-[4/3] rounded-xl bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 flex items-center justify-center p-2 overflow-hidden shadow-inner text-center">
                      {prop.type === 'latex' ? (
                        <div className="w-full max-w-full max-h-full overflow-auto flex items-center justify-center p-1 text-slate-950 dark:text-white">
                          <LatexRenderer latex={prop.content || '\\text{LaTeX-Vorschau}'} displayMode={true} className="text-sm sm:text-base max-w-full break-words" />
                        </div>
                      ) : prop.type === 'svg' ? (
                        <div
                          className="w-full h-full flex items-center justify-center p-1 text-slate-950 dark:text-white"
                          dangerouslySetInnerHTML={{ __html: prop.content }}
                        />
                      ) : prop.type === 'image' ? (
                        prop.content ? (
                          <img
                            src={prop.content}
                            alt={imageAssets.find((asset) => asset.id === prop.imageAssetId)?.name || pMeta.label}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400">Bild auswählen</span>
                        )
                      ) : prop.type === 'emoji' ? (
                        <span className="text-3xl select-none">{prop.content}</span>
                      ) : (
                        <span className="max-w-full max-h-full overflow-y-auto whitespace-pre-wrap break-words text-xs sm:text-sm font-extrabold text-slate-950 dark:text-white">
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
                          onClick={() => {
                            if (t === 'image') {
                              const asset = imageAssets.find((item) =>
                                item.id === prop.imageAssetId || item.content === prop.content
                              );
                              handleUpdateProperty(idx, pMeta.key, {
                                type: t,
                                content: asset?.content || '',
                                imageAssetId: asset?.id,
                              });
                            } else {
                              handleUpdateProperty(idx, pMeta.key, {
                                content: prop.type === 'image' ? '' : prop.content,
                                type: t,
                                imageAssetId: undefined,
                              });
                            }
                          }}
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

                    {/* Quick math snippets */}
                    {prop.type === 'latex' && (
                      <div className="flex flex-wrap items-center gap-1 py-0.5">
                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">Schnellbausteine:</span>
                        {[
                          { label: 'x^2', snippet: 'x^2' },
                          { label: '\\frac{a}{b}', snippet: '\\frac{a}{b}' },
                          { label: '\\sqrt{x}', snippet: '\\sqrt{x}' },
                          { label: '\\alpha', snippet: '\\alpha ' },
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
                    {prop.type === 'emoji' && (
                      <EmojiPicker
                        value={prop.content}
                        onChange={(content) => handleUpdateProperty(idx, pMeta.key, { content })}
                        label="Karten-Emoji"
                      />
                    )}
                    {prop.type === 'image' ? (
                      imageAssets.length > 0 ? (
                        <select
                          value={imageAssets.some((asset) => asset.id === prop.imageAssetId) ? prop.imageAssetId : ''}
                          aria-label={`Bild für ${pMeta.label} auswählen`}
                          onChange={(event) => {
                            const asset = imageAssets.find((item) => item.id === event.target.value);
                            if (asset) {
                              handleUpdateProperty(idx, pMeta.key, {
                                content: asset.content,
                                imageAssetId: asset.id,
                              });
                            }
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        >
                          <option value="">Bild auswählen…</option>
                          {imageAssets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.name || 'Unbenanntes Bild'}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="rounded-lg border border-dashed border-slate-300 px-2.5 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          Füge zuerst oben ein Bild zur Set-Bildsammlung hinzu.
                        </p>
                      )
                    ) : (
                      <input
                        type="text"
                        value={prop.content}
                        onChange={(e) => {
                          const val = e.target.value;
                          let inferredType = prop.type;
                          if (val.startsWith('data:image')) {
                            const asset = addImageAsset(val, pMeta.label);
                            handleUpdateProperty(idx, pMeta.key, {
                              content: asset.content,
                              type: 'image',
                              imageAssetId: asset.id,
                            });
                            return;
                          }
                          if (val.includes('\\') || val.includes('_') || val.includes('^')) inferredType = 'latex';
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
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={handleAddEmptyPair}
          className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <Plus className="h-4 w-4" />
          Konzept hinzufügen
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={pairs.length === 0}
          className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
        >
          <Save className="h-4 w-4" />
          Speichern
        </button>
      </div>

      {/* Math formula / image modal */}
      {modalTarget && (
        <FormulaAndImageModal
          isOpen={true}
          onClose={() => setModalTarget(null)}
          initialContent={
            pairs[modalTarget.pairIdx]?.properties?.[modalTarget.propKey]?.content || ''
          }
          initialLabel={
            pairs[modalTarget.pairIdx]?.properties?.[modalTarget.propKey]?.label || ''
          }
          onApply={(data) => {
            if (data.type === 'image') {
              const asset = addImageAsset(data.content, data.label || 'Eingefügtes Bild');
              handleUpdateProperty(modalTarget.pairIdx, modalTarget.propKey, {
                content: asset.content,
                type: 'image',
                imageAssetId: asset.id,
              });
            } else {
              handleUpdateProperty(modalTarget.pairIdx, modalTarget.propKey, {
                content: data.content,
                type: data.type,
                imageAssetId: undefined,
              });
            }
            setModalTarget(null);
          }}
        />
      )}
    </div>
  );
};
