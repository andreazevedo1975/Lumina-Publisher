import { GoogleGenAI } from "@google/genai";

// Safe access to environment variable in browser environment
const getApiKey = () => {
  try {
    // @ts-ignore
    return (typeof process !== 'undefined' && process.env && process.env.API_KEY) || '';
  } catch (e) {
    return '';
  }
};

const getAI = () => {
    const key = getApiKey();
    if (!key) throw new Error("API Key ausente ou inválida.");
    return new GoogleGenAI({ apiKey: key });
};

export const generateAltText = async (imageBase64: string): Promise<string> => {
  try {
    const ai = getAI();
    const model = 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', // Assuming jpeg for simplicity in this demo context
              data: imageBase64.split(',')[1] || imageBase64,
            },
          },
          {
            text: 'Gere um texto alternativo (alt text) conciso e descritivo para esta imagem, adequado para leitores de tela em um contexto de ebook. Foque no conteúdo visual. Responda em Português do Brasil.',
          },
        ],
      },
    });

    return response.text || "Não foi possível gerar a descrição.";
  } catch (error) {
    console.error("Gemini Alt Text Error:", error);
    return "Erro: Verifique a API Key.";
  }
};

export const suggestCopyEdit = async (content: string): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Atue como um revisor de texto sênior. Melhore o conteúdo a seguir para clareza, fluidez e gramática correta, mantendo a voz do autor.
            
            O conteúdo está em formato HTML. Você DEVE:
            1. Preservar todas as tags HTML (como <p>, <h1>, <strong>, <em>, <ul>, etc) EXATAMENTE como estão.
            2. Manter a estrutura hierárquica.
            3. Apenas corrigir e melhorar o texto legível dentro das tags.
            4. Responder em Português do Brasil.
            5. Retornar APENAS o HTML resultante, sem explicações e sem blocos de código markdown (\`\`\`html).

            Conteúdo HTML: "${content}"`,
        });
        
        let cleaned = response.text || content;
        // Clean up if Gemini wraps in code blocks despite instructions
        cleaned = cleaned.replace(/^```html\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
        
        return cleaned;
    } catch (error) {
        console.error("Gemini Copy Edit Error:", error);
        return content;
    }
}

export const generateBookSummary = async (bookContent: string): Promise<string> => {
    try {
        const ai = getAI();
        // Truncate to avoid context limits if book is absolutely massive, though 1.5/2.5 handles huge context.
        // We take the first 100k characters which usually covers intro, first chapters, etc.
        const contentSample = bookContent.substring(0, 100000); 
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analise o conteúdo do livro fornecido abaixo.
            
            Gere um resumo conciso, ideal para a página de capa ou descrição (blurb).
            Foque nos temas principais e no público-alvo.
            
            Estruture a resposta com:
            - **Sinopse Sugerida** (1-2 parágrafos atraentes)
            - **Temas Principais** (Lista de bullet points)
            - **Público-Alvo Recomendado**
            
            Responda em Português do Brasil.
            
            Conteúdo do Livro (Amostra):
            ${contentSample}`
        });
        return response.text || "Não foi possível gerar o resumo.";
    } catch (error) {
        console.error("Gemini Summary Error:", error);
        return "Erro ao gerar resumo. Verifique a API Key.";
    }
}

export const runPreflightCheck = async (documentSummary: string): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Atue como um editor de livros experiente e amigável. Analise o resumo deste projeto de ebook.
            
            Seu objetivo é dar um feedback simples e direto para um autor que NÃO entende de programação ou termos técnicos (como HTML, CSS, ARIA, Tags).
            
            Foque em:
            1. Legibilidade (tamanho do livro, quantidade de conteúdo).
            2. Experiência do leitor (se há imagens, se os capítulos parecem organizados).
            3. Dicas visuais simples.

            Use uma linguagem encorajadora. Use listas com bolinhas para facilitar a leitura.
            Responda em Português do Brasil.
            
            Resumo do Projeto: ${documentSummary}`,
        });
        return response.text || "Tudo parece ótimo com seu livro!";
    } catch (error) {
         console.error("Gemini Preflight Error:", error);
         return "Não foi possível completar a verificação no momento.";
    }
}

const urlToBase64 = async (url: string): Promise<{ data: string, mimeType: string }> => {
    // If already data URL
    if (url.startsWith('data:')) {
        const matches = url.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
            return { mimeType: matches[1], data: matches[2] };
        }
    }
    
    // Fetch external URL
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result as string;
                const matches = base64data.match(/^data:(.+);base64,(.+)$/);
                if (matches) {
                    resolve({ mimeType: matches[1], data: matches[2] });
                } else {
                    reject(new Error("Falha na conversão base64"));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Failed to fetch image for AI editing:", e);
        throw new Error("Não foi possível carregar a imagem de referência (CORS ou erro de rede).");
    }
};

export const generateImage = async (prompt: string, referenceImageUrl?: string): Promise<string> => {
    try {
        const ai = getAI();
        const parts: any[] = [];
        
        // If we have a reference image, add it first (for editing/variation)
        if (referenceImageUrl) {
             const { data, mimeType } = await urlToBase64(referenceImageUrl);
             parts.push({
                 inlineData: {
                     mimeType,
                     data
                 }
             });
        }
        
        parts.push({ text: prompt });

        // Using gemini-2.5-flash-image for generation and editing
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: parts
            },
            config: {
                imageConfig: {
                    aspectRatio: "1:1"
                }
            }
        });

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                }
            }
        }
        
        throw new Error("Nenhuma imagem gerada pelo modelo.");
    } catch (error) {
        console.error("Gemini Image Generation Error:", error);
        throw error;
    }
};

// Helper to convert HTML from Mammoth to Markdown-like structure locally
const cleanDocxHtmlToMarkdown = (html: string): string => {
    let text = html;
    
    // Headers to Markdown (preserving content)
    text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, (match, content) => `\n# ${content.replace(/<[^>]+>/g, '')}\n\n`);
    text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, (match, content) => `\n## ${content.replace(/<[^>]+>/g, '')}\n\n`);
    text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, (match, content) => `\n### ${content.replace(/<[^>]+>/g, '')}\n\n`);
    text = text.replace(/<h[4-6][^>]*>(.*?)<\/h[4-6]>/gi, (match, content) => `\n#### ${content.replace(/<[^>]+>/g, '')}\n\n`);

    // Paragraphs and breaks
    text = text.replace(/<\/p>/gi, '\n\n');
    text = text.replace(/<\/div>/gi, '\n\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    
    // Remove scripts and styles
    text = text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "");
    text = text.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, "");

    // Strip remaining tags
    text = text.replace(/<[^>]+>/g, ' '); 
    
    // Decode entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/\s+/g, ' '); // Normalize whitespace

    return text.trim();
}

export const parseDocumentToMarkdown = async (file: File): Promise<{ text: string, images: string[] }> => {
  const apiKey = getApiKey();

  // Handle DOCX files
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
              try {
                  if (!e.target?.result) throw new Error("Falha ao ler o arquivo");
                  const arrayBuffer = e.target.result as ArrayBuffer;
                  
                  // @ts-ignore
                  const mammoth = window.mammoth;
                  if (!mammoth) throw new Error("Biblioteca Mammoth não carregada.");

                  const result = await mammoth.convertToHtml({ arrayBuffer });
                  const rawHtml = result.value;
                  const images: string[] = [];

                  // Extract images
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(rawHtml, 'text/html');
                  const imgElements = doc.querySelectorAll('img');
                  imgElements.forEach((img: HTMLImageElement) => {
                      if (img.src && img.src.startsWith('data:image')) {
                          images.push(img.src);
                      }
                  });

                  const markdownText = cleanDocxHtmlToMarkdown(rawHtml);
                  resolve({ text: markdownText, images });
              } catch (error) {
                  console.error("DOCX Processing Error:", error);
                  reject(error);
              }
          };
          reader.onerror = (err) => reject(err);
          reader.readAsArrayBuffer(file);
      });
  }

  // Handle PDF files using local PDF.js (No Token Limits)
  if (file.type === 'application/pdf') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                if (!e.target?.result) throw new Error("Falha ao ler o PDF");
                const typedarray = new Uint8Array(e.target.result as ArrayBuffer);

                // @ts-ignore
                const pdfjsLib = window.pdfjsLib;
                if (!pdfjsLib) throw new Error("Biblioteca PDF.js não carregada.");

                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                const numPages = pdf.numPages;
                const textPages: string[] = [];

                // Iterate over all pages
                for (let i = 1; i <= numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    
                    // Advanced PDF Text Extraction
                    // Sort items by Y (desc) then X (asc) to ensure reading order
                    const items = textContent.items.map((item: any) => ({
                        str: item.str,
                        x: item.transform[4],
                        y: item.transform[5],
                        width: item.width,
                        hasEOL: item.hasEOL
                    }));

                    items.sort((a: any, b: any) => {
                        // Sort by line (Y) with a small tolerance (e.g. 5 units) for uneven scans
                        if (Math.abs(b.y - a.y) > 5) {
                            return b.y - a.y;
                        }
                        return a.x - b.x;
                    });

                    // Reconstruct text with smart spacing
                    let pageStr = '';
                    let lastY = -1;
                    let lastX = -1;
                    let lastWidth = 0;
                    
                    items.forEach((item: any) => {
                        if (lastY !== -1) {
                            const dy = Math.abs(item.y - lastY);
                            if (dy > 10) {
                                pageStr += '\n'; // New line
                            } else {
                                // Check for horizontal space
                                const dx = item.x - (lastX + lastWidth);
                                // If distance is somewhat significant, add a space. 
                                // Threshold 2 is a heuristic for typical font sizes.
                                if (dx > 2) {
                                    pageStr += ' ';
                                }
                            }
                        }
                        
                        pageStr += item.str;
                        lastY = item.y;
                        lastX = item.x;
                        lastWidth = item.width;
                    });

                    textPages.push(pageStr);
                }
                
                // Combine all pages with double newlines to ensure paragraph breaks
                const fullText = textPages.join('\n\n');

                resolve({ text: fullText, images: [] });
            } catch (error) {
                console.error("PDF Processing Error:", error);
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
      });
  }

  throw new Error(`Formato de arquivo não suportado: ${file.type}`);
};