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

export const suggestCopyEdit = async (text: string): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Atue como um revisor de texto sênior. Melhore o texto a seguir para clareza, fluidez e gramática correta, mas mantenha a voz do autor. Retorne apenas o texto corrigido em Português do Brasil. Texto: "${text}"`,
        });
        return response.text || text;
    } catch (error) {
        console.error("Gemini Copy Edit Error:", error);
        return text;
    }
}

export const runPreflightCheck = async (documentSummary: string): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analise este resumo da estrutura do ebook quanto à acessibilidade e melhores práticas de layout (padrões EPUB3). Aponte possíveis problemas com hierarquia ou metadados ausentes. Responda em Português do Brasil. Resumo: ${documentSummary}`,
        });
        return response.text || "Nenhum problema encontrado.";
    } catch (error) {
         console.error("Gemini Preflight Error:", error);
         return "Erro na verificação. API Key inválida?";
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

export const parseDocumentToMarkdown = async (file: File): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key ausente. Configure sua chave de API.");

  // Handle DOCX files using local conversion (Mammoth global) + Gemini Formatting
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
              try {
                  if (!e.target?.result) throw new Error("Falha ao ler o arquivo");
                  const arrayBuffer = e.target.result as ArrayBuffer;
                  
                  // Access mammoth from global window object (loaded via script tag)
                  // @ts-ignore
                  const mammoth = window.mammoth;
                  
                  if (!mammoth) throw new Error("Biblioteca Mammoth não carregada.");

                  // Extract raw text from DOCX
                  const result = await mammoth.extractRawText({ arrayBuffer });
                  const rawText = result.value;

                  // Use Gemini to structure the raw text into Markdown
                  const ai = getAI();
                  const model = 'gemini-2.5-flash';
                  const response = await ai.models.generateContent({
                      model,
                      contents: `Atue como um diagramador profissional. O texto a seguir foi extraído de um arquivo DOCX. Sua tarefa é formatá-lo em Markdown limpo para um Ebook.
                      
                      Regras:
                      1. Identifique Títulos e Capítulos e use headers (# Título, ## Capítulo).
                      2. Mantenha os parágrafos separados corretamente.
                      3. Não resuma o texto, mantenha o conteúdo integral.
                      
                      Texto: 
                      ${rawText.substring(0, 60000)}` // Context limit safety
                  });
                  
                  resolve(response.text || rawText);
              } catch (error) {
                  console.error("DOCX Processing Error:", error);
                  reject(error);
              }
          };
          reader.onerror = (err) => reject(err);
          reader.readAsArrayBuffer(file);
      });
  }

  // Handle PDF files (Native Gemini Support)
  if (file.type === 'application/pdf') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          try {
            const ai = getAI();
            const model = 'gemini-2.5-flash';
            const response = await ai.models.generateContent({
              model,
              contents: {
                parts: [
                  {
                    inlineData: {
                      mimeType: 'application/pdf',
                      data: base64Data,
                    },
                  },
                  {
                    text: 'Aja como um motor de ingestão de livros. Extraia todo o conteúdo de texto deste documento. Mantenha a estrutura hierárquica usando cabeçalhos Markdown (# para Títulos, ## para Capítulos/Seções). Preserve todos os parágrafos originais. Não faça resumos, preciso do texto completo. Se houver imagens, ignore-as, foque no texto. Retorne apenas o texto formatado em Markdown.',
                  },
                ],
              },
            });
            resolve(response.text || "");
          } catch (error) {
            console.error("Gemini Parse Error (PDF):", error);
            reject(error);
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
  }

  throw new Error(`Formato de arquivo não suportado: ${file.type}`);
};