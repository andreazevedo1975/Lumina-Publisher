import { Project, Page, PageElement, ElementType } from '../types';

declare global {
  interface Window {
    JSZip: any;
  }
}

const escapeXml = (unsafe: string): string => {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

const generateCss = (project: Project): string => {
  return `
    body { font-family: 'Times New Roman', serif; margin: 0; padding: 0; }
    p { margin-bottom: 1em; line-height: 1.5; text-align: justify; }
    h1, h2, h3, h4, h5, h6 { font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em; }
    img { max-width: 100%; height: auto; }
    .page-break { page-break-after: always; }
    .center { text-align: center; }
  `;
};

const generatePageXhtml = (page: Page, index: number, project: Project): string => {
  // Sort elements by Y then X to ensure reading order
  const elements = [...page.elements].sort((a, b) => {
      const diffY = a.y - b.y;
      if (Math.abs(diffY) > 10) return diffY;
      return a.x - b.x;
  });

  let contentHtml = '';

  elements.forEach(el => {
      if (el.type === ElementType.TEXT) {
          // Clean up style attributes from content if any, relying on CSS classes primarily or inline styles if needed
          contentHtml += `<div class="text-block" style="
            margin-top: ${el.style.marginTop}px;
            margin-bottom: ${el.style.marginBottom}px;
            text-align: ${el.style.textAlign};
            font-size: ${el.style.fontSize}pt;
            font-family: '${el.style.fontFamily}', serif;
          ">${el.content}</div>\n`;
      } else if (el.type === ElementType.IMAGE) {
          contentHtml += `<div class="image-block" style="text-align: center; margin: 1em 0;">
            <img src="${el.content}" alt="${el.altText || 'Imagem'}" style="max-width: 100%;" />
          </div>\n`;
      }
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="pt">
<head>
  <title>${project.name} - Pág ${index + 1}</title>
  <link rel="stylesheet" type="text/css" href="styles.css" />
</head>
<body>
  ${contentHtml}
</body>
</html>`;
};

export const generateEpub = async (project: Project): Promise<void> => {
  if (!window.JSZip) {
      alert("Erro: Biblioteca de compressão não carregada. Tente recarregar a página.");
      return;
  }

  const zip = new window.JSZip();
  const title = project.name || "Ebook";
  const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  // 1. Mimetype (must be first, uncompressed)
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // 2. Container.xml
  zip.folder("META-INF")?.file("container.xml", `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const oebps = zip.folder("OEBPS");
  
  // 3. CSS
  oebps?.file("styles.css", generateCss(project));

  // 4. Content Pages & Spine
  let manifest = '';
  let spine = '';
  let navPoints = '';

  project.pages.forEach((page, index) => {
      const filename = `page_${index + 1}.xhtml`;
      const xhtml = generatePageXhtml(page, index, project);
      
      oebps?.file(filename, xhtml);

      manifest += `<item id="page_${index + 1}" href="${filename}" media-type="application/xhtml+xml"/>\n`;
      spine += `<itemref idref="page_${index + 1}"/>\n`;
      
      // Simple nav point for every page (could be refined to only chapters)
      navPoints += `
        <navPoint id="navPoint-${index + 1}" playOrder="${index + 1}">
          <navLabel><text>Página ${index + 1}</text></navLabel>
          <content src="${filename}"/>
        </navPoint>
      `;
  });

  // 5. Package OPF
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:identifier id="BookId">urn:uuid:${project.id}</dc:identifier>
    <dc:language>pt-BR</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]}Z</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style" href="styles.css" media-type="text/css"/>
    ${manifest}
  </manifest>
  <spine toc="ncx">
    ${spine}
  </spine>
</package>`;

  oebps?.file("content.opf", opf);

  // 6. NCX (Table of Contents for legacy support)
  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${project.id}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>
    ${navPoints}
  </navMap>
</ncx>`;

  oebps?.file("toc.ncx", ncx);

  // 7. Generate Blob and Download
  try {
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeTitle}.epub`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
  } catch (err) {
      console.error("Failed to generate EPUB", err);
      alert("Erro ao gerar arquivo EPUB.");
  }
};
