import SmilesDrawer from 'smiles-drawer';

// Common chemical database with verified 2D SMILES and SVG fallbacks
export interface ChemicalCompoundInfo {
  name: string;
  synonyms: string[];
  formula: string;
  smiles: string;
  category: string;
  description: string;
}

export const PRESET_COMPOUNDS: ChemicalCompoundInfo[] = [
  {
    name: 'Acetylsalicylsäure (Aspirin)',
    synonyms: ['aspirin', 'acetylsalicylsäure', 'ass', '2-acetyloxybenzoesäure'],
    formula: 'C9H8O4',
    smiles: 'CC(=O)Oc1ccccc1C(=O)O',
    category: 'Analgetikum / NSAR',
    description: 'Hemmt Cyclooxygenasen COX-1 und COX-2, Thrombozytenaggregationshemmer.',
  },
  {
    name: 'Paracetamol',
    synonyms: ['paracetamol', 'acetaminophen', '4-acetamidophenol'],
    formula: 'C8H9NO2',
    smiles: 'CC(=O)Nc1ccc(O)cc1',
    category: 'Nicht-Opioid-Analgetikum',
    description: 'Schmerzlindernd und fiebersenkend (Antipyretikum), kaum antiphlogistisch.',
  },
  {
    name: 'Ibuprofen',
    synonyms: ['ibuprofen', '2-(4-isobutylphenyl)propionsäure'],
    formula: 'C13H18O2',
    smiles: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O',
    category: 'Nichtsteroidales Antirheumatikum (NSAR)',
    description: 'Entzündungshemmend, analgetisch, antipyretisch bei Schmerzen und Rheuma.',
  },
  {
    name: 'Benzol',
    synonyms: ['benzol', 'benzene', 'c6h6'],
    formula: 'C6H6',
    smiles: 'c1ccccc1',
    category: 'Aromat / Grundbaustein',
    description: 'Prototypischer aromatischer Kohlenwasserstoff mit delokalisierten Pi-Elektronen.',
  },
  {
    name: 'Koffein',
    synonyms: ['koffein', 'coffein', 'caffeine', '1,3,7-trimethylxanthin'],
    formula: 'C8H10N4O2',
    smiles: 'Cn1cnc2c1c(=O)n(c(=O)n2C)C',
    category: 'Purin-Alkaloid / Stimulans',
    description: 'Zentralnervöses Stimulans, Antagonist an Adenosin-Rezeptoren (A1 und A2A).',
  },
  {
    name: 'Ethanol',
    synonyms: ['ethanol', 'alkohol', 'ethylalkohol', 'trinkalkohol'],
    formula: 'C2H6O',
    smiles: 'CCO',
    category: 'Aliphatischer Alkohol',
    description: 'Lösungsmittel, Desinfektionsmittel und Genussmittel.',
  },
  {
    name: 'Morphin',
    synonyms: ['morphin', 'morphium', 'morphine'],
    formula: 'C17H19NO3',
    smiles: 'CN1CCC23C4C1CC5=C2C(=C(C=C5)O)OC3C(C=C4)O',
    category: 'Opioid-Analgetikum',
    description: 'Stark wirksames Betäubungsmittel am my-Opioidrezeptor.',
  },
  {
    name: 'Dopamin',
    synonyms: ['dopamin', 'dopamine', '4-(2-aminoethyl)benzol-1,2-diol'],
    formula: 'C8H11NO2',
    smiles: 'NCCc1ccc(O)c(O)c1',
    category: 'Biogenes Amin / Neurotransmitter',
    description: 'Wichtiger Botenstoff des zentralen Belohnungssystems und der Motorik.',
  },
  {
    name: 'Serotonin',
    synonyms: ['serotonin', '5-ht', '5-hydroxytryptamin'],
    formula: 'C10H12N2O',
    smiles: 'NCCc1c[nH]c2ccc(O)cc12',
    category: 'Gewebehormon & Neurotransmitter',
    description: 'Reguliert Stimmung, Schlaf-Wach-Rhythmus, Darmmotilität und Gefäßtonus.',
  },
  {
    name: 'Penicillin G',
    synonyms: ['penicillin', 'benzylpenicillin', 'penicillin g'],
    formula: 'C16H18N2O4S',
    smiles: 'CC1(C)SC2C(NC(=O)Cc3ccccc3)C(=O)N2C1C(=O)O',
    category: 'Beta-Lactam-Antibiotikum',
    description: 'Hemmt die bakterielle Zellwandsynthese (D-Alanin-Transpeptidase).',
  },
  {
    name: 'Glucose',
    synonyms: ['glucose', 'traubenzucker', 'd-glucose', 'dextrose'],
    formula: 'C6H12O6',
    smiles: 'C(C1C(C(C(C(O1)O)O)O)O)O',
    category: 'Monosaccharid / Kohlenhydrat',
    description: 'Universeller Energielieferant der Zellatmung und Glykolyse.',
  },
  {
    name: 'Salicylsäure',
    synonyms: ['salicylsäure', '2-hydroxybenzoesäure'],
    formula: 'C7H6O3',
    smiles: 'c1ccc(c(c1)C(=O)O)O',
    category: 'Keratolytikum & Vorstufe',
    description: 'Natürlich vorkommende Pflanzensäure (z.B. Weidenrinde), Vorstufe von ASS.',
  },
  {
    name: 'Phenol',
    synonyms: ['phenol', 'hydroxybenzol', 'karbolsäure'],
    formula: 'C6H6O',
    smiles: 'c1ccccc1O',
    category: 'Aromat & Desinfizienz',
    description: 'Einfachster aromatischer Alkohol mit schwach sauren Eigenschaften.',
  },
  {
    name: 'Anilin',
    synonyms: ['anilin', 'aminobenzol'],
    formula: 'C6H7N',
    smiles: 'c1ccccc1N',
    category: 'Aromatisches Amin',
    description: 'Wichtiger Grundstoff für Farbstoffe und Pharmazeutika.',
  },
  {
    name: 'Essigsäure',
    synonyms: ['essigsäure', 'ethansäure', 'ch3cooh'],
    formula: 'C2H4O2',
    smiles: 'CC(=O)O',
    category: 'Carbonsäure',
    description: 'Einfache aliphatische Carbonsäure, Grundstoff der Azidität.',
  },
];

// Helper to find a preset compound by query
export function findPresetCompound(query: string): ChemicalCompoundInfo | undefined {
  if (!query) return undefined;
  const clean = query.trim().toLowerCase();
  return PRESET_COMPOUNDS.find(
    (c) =>
      c.name.toLowerCase().includes(clean) ||
      c.formula.toLowerCase() === clean ||
      c.smiles.toLowerCase() === clean ||
      c.synonyms.some((s) => s.toLowerCase() === clean || clean.includes(s.toLowerCase()))
  );
}

// Convert ChemFig LaTeX or text patterns to SMILES if possible
export function convertLatexOrTextToSmiles(input: string): string | null {
  if (!input || !input.trim()) return null;
  const trimmed = input.trim();

  // If already a raw SMILES (e.g. c1ccccc1 or CC(=O)O)
  if (/^[A-Za-z0-9@+\-\[\]\(\)\/\\=#$%.~]+$/.test(trimmed) && !trimmed.includes('\\')) {
    // Basic heuristics: has ring numbers or bonds or typical SMILES tokens
    if (trimmed.length >= 2) return trimmed;
  }

  // Check known compounds in dictionary
  const matched = findPresetCompound(trimmed);
  if (matched) return matched.smiles;

  // Check for \chemfig{...} patterns
  const chemfigMatch = trimmed.match(/\\chemfig\{([^}]+)\}/);
  if (chemfigMatch) {
    const body = chemfigMatch[1].trim();

    // Map common chemfig patterns
    if (body.includes('*6(-=-=-=)') || body.includes('*6(=-=-=-)')) {
      if (body.includes('-(-COOH)') && body.includes('-(-OAc)')) return 'CC(=O)Oc1ccccc1C(=O)O'; // Aspirin
      if (body.includes('-(-OH)') && body.includes('-(-NHAc)')) return 'CC(=O)Nc1ccc(O)cc1'; // Paracetamol
      if (body.includes('-(-OH)')) return 'c1ccccc1O'; // Phenol
      if (body.includes('-(-COOH)')) return 'c1ccccc1C(=O)O'; // Benzoic acid
      if (body.includes('-(-NH_2)') || body.includes('-(-NH2)')) return 'c1ccccc1N'; // Aniline
      return 'c1ccccc1'; // Benzene
    }

    if (body.includes('H_3C-CH_2-OH') || body.includes('CH3-CH2-OH')) return 'CCO';
    if (body.includes('CH_3-COOH') || body.includes('CH3-COOH')) return 'CC(=O)O';
    if (body.includes('H_2N-CH_2-COOH')) return 'NCC(=O)O'; // Glycine
  }

  return null;
}

// Render SMILES to a clean, crisp SVG string with high contrast
export function renderSmilesToSvg(
  smiles: string,
  options?: {
    width?: number;
    height?: number;
    isDark?: boolean;
    bondThickness?: number;
  }
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const isDark = options?.isDark ?? false;
      const width = options?.width || 220;
      const height = options?.height || 180;
      const bondThickness = options?.bondThickness || 2.5;

      const drawerOptions = {
        width,
        height,
        bondThickness,
        bondLength: 16,
        shortBondLength: 0.85,
        bondSpacing: 0.18 * 16,
        atomVisualization: 'default',
        isomeric: true,
        terminalCarbons: true,
        explicitHydrogens: false,
        overlapSensitivity: 0.42,
        compactDrawing: false,
        fontSizeLarge: 11,
        fontSizeSmall: 7,
        padding: 10,
        themes: {
          light: {
            C: '#0f172a',
            O: '#dc2626',
            N: '#2563eb',
            F: '#16a34a',
            CL: '#16a34a',
            BR: '#b45309',
            I: '#7c3aed',
            P: '#ea580c',
            S: '#d97706',
            B: '#be185d',
            SI: '#0891b2',
            H: '#334155',
            BACKGROUND: 'transparent',
          },
          dark: {
            C: '#f8fafc',
            O: '#f87171',
            N: '#60a5fa',
            F: '#4ade80',
            CL: '#4ade80',
            BR: '#f59e0b',
            I: '#c084fc',
            P: '#fb923c',
            S: '#facc15',
            B: '#f472b6',
            SI: '#22d3ee',
            H: '#cbd5e1',
            BACKGROUND: 'transparent',
          },
        },
      };

      SmilesDrawer.parse(
        smiles,
        (tree: any) => {
          try {
            const svgDrawer = new SmilesDrawer.SvgDrawer(drawerOptions);
            const svgElem = svgDrawer.draw(tree, null, isDark ? 'dark' : 'light');

            if (svgElem) {
              svgElem.setAttribute('viewBox', `0 0 ${width} ${height}`);
              svgElem.setAttribute('class', 'w-full h-full object-contain filter drop-shadow-xs');
              svgElem.setAttribute('preserveAspectRatio', 'xMidYMid meet');
              resolve(svgElem.outerHTML);
            } else {
              reject(new Error('SvgDrawer did not return an element'));
            }
          } catch (drawErr) {
            reject(drawErr);
          }
        },
        (parseErr: any) => {
          reject(parseErr);
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}
