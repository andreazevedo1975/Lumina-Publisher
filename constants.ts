
import { TypographyStyle, BoxStyle, Unit, MasterPage, Page, Project, ColorSpace, ColorSwatch, ElementType } from './types';

export const DEFAULT_TYPOGRAPHY: TypographyStyle = {
  fontFamily: 'Merriweather',
  fontSize: 12,
  fontSizeUnit: Unit.PT,
  fontWeight: 400,
  fontStyle: 'normal',
  lineHeight: 1.5,
  lineHeightUnit: 1.5,
  letterSpacing: 0,
  letterSpacingUnit: Unit.EM,
  wordSpacing: 0,
  wordSpacingUnit: Unit.EM,
  fontKerning: 'normal',
  textAlign: 'left',
  hyphens: 'auto',
  color: '#1e293b', // slate-800
  textTransform: 'none',
  textDecoration: 'none',
  widows: 2,
  orphans: 2,
};

export const DEFAULT_BOX: BoxStyle = {
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  borderWidth: 0,
  borderColor: '#000000',
  backgroundColor: 'transparent',
  opacity: 1,
  filter: 'none',
  objectFit: 'cover'
};

export const INITIAL_SWATCHES: ColorSwatch[] = [
    { id: 'sw-1', name: 'Papel', value: '#ffffff', space: ColorSpace.RGB, components: [255, 255, 255] },
    { id: 'sw-2', name: 'Preto', value: '#000000', space: ColorSpace.RGB, components: [0, 0, 0] },
    { id: 'sw-3', name: 'Azul Lumina', value: '#1d4ed8', space: ColorSpace.RGB, components: [29, 78, 216] },
    { id: 'sw-4', name: 'Vermelho Alerta', value: '#ef4444', space: ColorSpace.CMYK, components: [0, 84, 77, 0] }, 
    { id: 'sw-5', name: 'Preto Rico', value: '#0a0a0a', space: ColorSpace.CMYK, components: [60, 40, 40, 100] },
    { id: 'sw-6', name: 'Cinza Texto', value: '#334155', space: ColorSpace.RGB, components: [51, 65, 85] },
    { id: 'sw-7', name: 'Destaque Amarelo', value: '#facc15', space: ColorSpace.RGB, components: [250, 204, 21] },
];

// --- MASTER PAGES EXAMPLES (10 Variations) ---

// 1. A-Padrão: Standard Text Page with Header/Footer
const MASTER_A: MasterPage = {
  id: 'master-a',
  name: 'A-Padrão (Texto)',
  gridColumns: 12,
  gridGutter: 12,
  baselineGrid: 14,
  elements: [
    {
      id: 'ma-head-line', type: ElementType.SHAPE, content: '',
      style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX, backgroundColor: '#e2e8f0' },
      x: 40, y: 50, width: 515, height: 1, rotation: 0, locked: true
    },
    {
      id: 'ma-head-text', type: ElementType.TEXT, content: '<p style="color:#94a3b8; font-size:10px;">{{title}}</p>',
      style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX },
      x: 40, y: 30, width: 300, height: 20, rotation: 0, locked: true
    },
    {
      id: 'ma-foot-num', type: ElementType.TEXT, content: '<p style="text-align:center; color:#64748b;">[ # ]</p>',
      style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX },
      x: 0, y: 800, width: 595, height: 20, rotation: 0, locked: true
    }
  ],
};

// 2. B-Abertura: Chapter Opening (Deep top margin, no header)
const MASTER_B: MasterPage = {
  id: 'master-b',
  name: 'B-Abertura Capítulo',
  gridColumns: 12,
  gridGutter: 12,
  baselineGrid: 14,
  elements: [
    {
      id: 'mb-foot-num', type: ElementType.TEXT, content: '<p style="text-align:center; color:#64748b; font-weight:bold;">[ # ]</p>',
      style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX },
      x: 0, y: 800, width: 595, height: 20, rotation: 0, locked: true
    }
  ],
};

// 3. C-Colunas Duplas: 2 Columns Grid
const MASTER_C: MasterPage = {
  id: 'master-c',
  name: 'C-Colunas Duplas',
  gridColumns: 2,
  gridGutter: 24,
  baselineGrid: 12,
  elements: [
     {
      id: 'mc-divider', type: ElementType.SHAPE, content: '',
      style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX, backgroundColor: '#f1f5f9' },
      x: 297, y: 60, width: 1, height: 720, rotation: 0, locked: true
    },
    {
      id: 'mc-foot-text', type: ElementType.TEXT, content: '<p style="text-align:right; color:#94a3b8; font-size:9px;">Seção de Referência</p>',
      style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX },
      x: 355, y: 810, width: 200, height: 20, rotation: 0, locked: true
    }
  ],
};

// 4. D-Colunas Triplas: 3 Columns Grid (Dense)
const MASTER_D: MasterPage = {
  id: 'master-d',
  name: 'D-Colunas Triplas',
  gridColumns: 3,
  gridGutter: 16,
  baselineGrid: 10,
  elements: [
    {
      id: 'md-head-bar', type: ElementType.SHAPE, content: '',
      style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX, backgroundColor: '#334155' },
      x: 40, y: 40, width: 515, height: 4, rotation: 0, locked: true
    }
  ],
};

// 5. E-Margem Notas: Wide Right Margin for Sidenotes
const MASTER_E: MasterPage = {
  id: 'master-e',
  name: 'E-Notas Laterais',
  gridColumns: 12, // Conceptually we use 8 for text, 4 for notes
  gridGutter: 12,
  baselineGrid: 14,
  elements: [
    {
      id: 'me-guide', type: ElementType.SHAPE, content: '',
      style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX, backgroundColor: '#e2e8f0', opacity: 0.5 },
      x: 400, y: 60, width: 1, height: 720, rotation: 0, locked: true
    }
  ],
};

// 6. F-Imagem Cheia: Full Bleed (Minimal margins)
const MASTER_F: MasterPage = {
  id: 'master-f',
  name: 'F-Imagem Cheia',
  gridColumns: 1,
  gridGutter: 0,
  baselineGrid: 20,
  elements: [], // Clean slate for images
};

// 7. G-Grade Modular: 6 Columns for flexible layouts
const MASTER_G: MasterPage = {
  id: 'master-g',
  name: 'G-Grade Modular (6)',
  gridColumns: 6,
  gridGutter: 20,
  baselineGrid: 16,
  elements: [
     {
      id: 'mg-corner', type: ElementType.SHAPE, content: '',
      style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX, borderColor: '#cbd5e1', borderWidth: 1 },
      x: 30, y: 30, width: 20, height: 20, rotation: 0, locked: true
    },
    {
      id: 'mg-corner-b', type: ElementType.SHAPE, content: '',
      style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX, borderColor: '#cbd5e1', borderWidth: 1 },
      x: 545, y: 792, width: 20, height: 20, rotation: 0, locked: true
    }
  ],
};

// 8. H-Destaque Escuro: Dark Background Page
const MASTER_H: MasterPage = {
  id: 'master-h',
  name: 'H-Fundo Escuro',
  gridColumns: 12,
  gridGutter: 16,
  baselineGrid: 18,
  elements: [
    {
      id: 'mh-bg', type: ElementType.SHAPE, content: '',
      style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX, backgroundColor: '#0f172a' },
      x: 0, y: 0, width: 595, height: 842, rotation: 0, locked: true
    },
    {
       id: 'mh-pagenum', type: ElementType.TEXT, content: '<p style="text-align:center; color:#475569;">●</p>',
       style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX },
       x: 0, y: 800, width: 595, height: 20, rotation: 0, locked: true
    }
  ],
};

// 9. I-Frente (Recto): Page Number Right
const MASTER_I: MasterPage = {
  id: 'master-i',
  name: 'I-Frente (Direita)',
  gridColumns: 12,
  gridGutter: 12,
  baselineGrid: 14,
  elements: [
    {
      id: 'mi-num', type: ElementType.TEXT, content: '<p style="text-align:right; font-weight:bold;">#</p>',
      style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX },
      x: 500, y: 800, width: 55, height: 20, rotation: 0, locked: true
    }
  ],
};

// 10. J-Verso (Verso): Page Number Left
const MASTER_J: MasterPage = {
  id: 'master-j',
  name: 'J-Verso (Esquerda)',
  gridColumns: 12,
  gridGutter: 12,
  baselineGrid: 14,
  elements: [
    {
      id: 'mj-num', type: ElementType.TEXT, content: '<p style="text-align:left; font-weight:bold;">#</p>',
      style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX },
      x: 40, y: 800, width: 55, height: 20, rotation: 0, locked: true
    }
  ],
};

export const INITIAL_MASTERS: MasterPage[] = [
    MASTER_A, MASTER_B, MASTER_C, MASTER_D, MASTER_E, 
    MASTER_F, MASTER_G, MASTER_H, MASTER_I, MASTER_J
];

export const INITIAL_PAGE: Page = {
  id: 'page-1',
  masterPageId: 'master-a',
  elements: [
    {
      id: 'el-1',
      type: ElementType.TEXT,
      content: '<h1>Capítulo Um</h1><p>A noite estava fria e a tipografia estava impecável.</p>',
      style: { ...DEFAULT_TYPOGRAPHY, ...DEFAULT_BOX, fontSize: 24, marginBottom: 20 },
      x: 50,
      y: 100,
      width: 500,
      height: 200,
      rotation: 0,
      locked: false,
    }
  ],
};

export const INITIAL_PROJECT: Project = {
  id: 'project-1',
  name: 'Ebook Sem Título',
  width: 595, // A4 approx in PT (conceptually)
  height: 842,
  unit: Unit.PT,
  pages: [INITIAL_PAGE],
  masterPages: INITIAL_MASTERS,
  activePageId: 'page-1',
  activeElementId: 'el-1',
  assets: [
    'https://picsum.photos/400/300',
    'https://picsum.photos/400/600',
    'https://picsum.photos/800/600',
  ],
  swatches: INITIAL_SWATCHES,
  activeColorSpace: ColorSpace.RGB
};