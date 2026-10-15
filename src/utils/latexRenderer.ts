import { mathjax } from 'mathjax-full/js/mathjax';
import { TeX } from 'mathjax-full/js/input/tex';
import { SVG } from 'mathjax-full/js/output/svg';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages';

let adaptor: ReturnType<typeof liteAdaptor> | null = null;
let html: ReturnType<typeof mathjax.document> | null = null;

function ensureInitialized() {
  if (adaptor && html) return;
  adaptor = liteAdaptor();
  RegisterHTMLHandler(adaptor);
  html = mathjax.document('', {
    InputJax: new TeX({ packages: AllPackages }),
    OutputJax: new SVG({ fontCache: 'none' }),
  });
}

// MathJax uses "ex" units. 1ex ≈ x-height ≈ 0.4423em of base font.
const EX_TO_PX = 0.4423;

export interface RenderedMath {
  xml: string;
  widthPx: number;
  heightPx: number;
  verticalAlignPx: number;
  display: boolean;
}

export function cleanLatex(raw: string): string {
  let tex = raw.trim();

  // Strip wrapping $$ ... $$
  if (tex.startsWith('$$') && tex.endsWith('$$') && tex.length >= 4) {
    tex = tex.slice(2, -2).trim();
  }
  // Strip wrapping \[ ... \]
  else if (tex.startsWith('\\[') && tex.endsWith('\\]') && tex.length >= 4) {
    tex = tex.slice(2, -2).trim();
  }
  // Strip wrapping \( ... \)
  else if (tex.startsWith('\\(') && tex.endsWith('\\)') && tex.length >= 4) {
    tex = tex.slice(2, -2).trim();
  }
  // Strip wrapping $ ... $
  else if (tex.startsWith('$') && tex.endsWith('$') && tex.length >= 2 && !tex.slice(1, -1).includes('$')) {
    tex = tex.slice(1, -1).trim();
  }

  // Convert equation / equation* environments to inner content
  tex = tex
    .replace(/\\begin\{equation\*?\}/g, '')
    .replace(/\\end\{equation\*?\}/g, '')
    .trim();

  // Convert align / align* environments to aligned for standalone MathJax SVG output
  tex = tex
    .replace(/\\begin\{align\*?\}/g, '\\begin{aligned}')
    .replace(/\\end\{align\*?\}/g, '\\end{aligned}');

  // Convert gather / gather* environments to gathered
  tex = tex
    .replace(/\\begin\{gather\*?\}/g, '\\begin{gathered}')
    .replace(/\\end\{gather\*?\}/g, '\\end{gathered}');

  // If contains newlines or \\ line breaks but no multi-line environment, wrap in aligned
  if ((tex.includes('\\\\') || tex.includes('\n')) && !tex.includes('\\begin{')) {
    tex = `\\begin{aligned}${tex}\\end{aligned}`;
  }

  return tex;
}

const renderCache = new Map<string, RenderedMath>();

export function renderLatexToSvg(
  rawLatex: string,
  options: {
    display?: boolean;
    color?: string;
    fontSize?: number;
  } = {}
): RenderedMath | null {
  const { display = false, color = '#000000', fontSize = 16 } = options;
  const tex = cleanLatex(rawLatex);
  if (!tex) return null;

  const cacheKey = `${tex}::${display}::${color}::${fontSize}`;
  if (renderCache.has(cacheKey)) {
    return renderCache.get(cacheKey)!;
  }

  try {
    ensureInitialized();

    const node = html!.convert(tex, { display });
    let svg = adaptor!.outerHTML(node);

    // Strip MathJax container wrapper
    const svgStart = svg.indexOf('<svg');
    const svgEnd = svg.lastIndexOf('</svg>');
    if (svgStart !== -1 && svgEnd !== -1) {
      svg = svg.slice(svgStart, svgEnd + 6);
    } else {
      return null;
    }

    // Replace currentColor with theme color for dark/light mode visibility
    if (color) {
      svg = svg.replace(/currentColor/g, color);
      svg = svg.replace('<svg', `<svg fill="${color}" color="${color}"`);
    }

    // Extract dimensions
    const wMatch = svg.match(/width="([\d.]+)ex"/);
    const hMatch = svg.match(/height="([\d.]+)ex"/);
    const vMatch = svg.match(/vertical-align:\s*([-\d.]+)ex/);

    const widthEx = wMatch?.[1] ? parseFloat(wMatch[1]) : 0;
    const heightEx = hMatch?.[1] ? parseFloat(hMatch[1]) : 0;
    const verticalAlignEx = vMatch?.[1] ? parseFloat(vMatch[1]) : 0;

    const pxPerEx = fontSize * EX_TO_PX;
    const widthPx = Math.max(Math.round(widthEx * pxPerEx), 12);
    const heightPx = Math.max(Math.round(heightEx * pxPerEx), Math.round(fontSize * 0.9));
    const verticalAlignPx = Math.round(verticalAlignEx * pxPerEx);

    const result: RenderedMath = {
      xml: svg,
      widthPx,
      heightPx,
      verticalAlignPx,
      display,
    };

    renderCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[latexRenderer] Failed to render LaTeX:', err);
    return null;
  }
}
