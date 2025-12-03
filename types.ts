
export enum Unit {
  PX = 'px',
  PT = 'pt',
  REM = 'rem',
  EM = 'em',
  MM = 'mm'
}

export enum ElementType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  SHAPE = 'SHAPE'
}

export enum ColorSpace {
  RGB = 'RGB',
  CMYK = 'CMYK'
}

export interface ColorSwatch {
  id: string;
  name: string;
  value: string; // Hex representation for CSS/UI
  space: ColorSpace;
  components: number[]; // [r,g,b] or [c,m,y,k] (0-100 for CMYK)
}

export interface TypographyStyle {
  fontFamily: string;
  fontSize: number;
  fontSizeUnit: Unit;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  lineHeight: number; // Leading
  lineHeightUnit: Unit | number; // unitless for relative
  letterSpacing: number; // Tracking
  letterSpacingUnit: Unit;
  wordSpacing: number; // New: spacing between words
  wordSpacingUnit: Unit;
  fontKerning: 'auto' | 'normal' | 'none'; // New: font metric kerning
  textAlign: 'left' | 'center' | 'right' | 'justify';
  hyphens: 'auto' | 'none' | 'manual';
  color: string;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration: 'none' | 'underline' | 'line-through';
  widows?: number; // New: prevent lonely lines at top of page
  orphans?: number; // New: prevent lonely lines at bottom of page
}

export interface BoxStyle {
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  borderWidth: number;
  borderColor: string;
  backgroundColor: string;
  opacity: number;
  filter: string; // New: CSS Filter support (e.g., grayscale)
  objectFit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down'; // Added for Image element sizing
}

export interface PageElement {
  id: string;
  type: ElementType;
  content: string; // Text content or Image URL
  style: TypographyStyle & BoxStyle;
  x: number; // For fixed layout
  y: number; // For fixed layout
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  altText?: string; // Accessibility
}

export interface MasterPage {
  id: string;
  name: string;
  elements: PageElement[];
  gridColumns: number;
  gridGutter: number;
  baselineGrid: number;
}

export interface Page {
  id: string;
  masterPageId: string;
  elements: PageElement[];
}

export interface Project {
  id: string;
  name: string;
  width: number;
  height: number;
  unit: Unit;
  pages: Page[];
  masterPages: MasterPage[];
  activePageId: string;
  activeElementId: string | null;
  assets: string[]; // List of image URLs
  swatches: ColorSwatch[];
  activeColorSpace: ColorSpace;
}

export enum ViewMode {
  EDIT = 'EDIT',
  PREVIEW = 'PREVIEW',
  GRID = 'GRID'
}