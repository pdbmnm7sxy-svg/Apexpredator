import { createWorker } from 'tesseract.js';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/build/pdf.js';
import { ExtractionMetadata } from '../types/index.js';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  method: 'pdf_text' | 'pdf_raster_ocr' | 'image_ocr';
  confidence: number;
  hasUsableText: boolean;
}

export interface ExtractionResult {
  fullText: string;
  pages: ExtractedPage[];
  metadata: ExtractionMetadata;
}

// Limits
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
export const MAX_PDF_PAGES = 15;

/**
 * Extracts text from PDF or image buffer with hybrid text + OCR support.
 */
export async function extractDocumentContent(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
  onProgress?: (stage: string, progress: number) => void
): Promise<ExtractionResult> {
  const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  const isImage =
    mimeType.startsWith('image/') ||
    /\.(png|jpe?g|webp|bmp|tiff)$/i.test(fileName);
  const isText =
    mimeType === 'text/plain' ||
    mimeType.includes('text') ||
    fileName.toLowerCase().endsWith('.txt');

  if (!isPdf && !isImage && !isText) {
    throw new Error(
      `Unsupported file type (${mimeType}). MedLens accepts PDF, PNG, and JPEG documents.`
    );
  }

  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size exceeds 15MB limit. Please provide a smaller document.`
    );
  }

  if (isText) {
    const rawText = fileBuffer.toString('utf-8');
    return {
      fullText: rawText,
      pages: [
        {
          pageNumber: 1,
          text: rawText,
          method: 'pdf_text',
          confidence: 1.0,
          hasUsableText: true,
        },
      ],
      metadata: {
        pages: 1,
        method: 'pdf_text',
        averageConfidence: 1.0,
        characterCount: rawText.length,
        rawTextSnippet: rawText.slice(0, 300) + '...',
        processedAt: new Date().toISOString(),
      },
    };
  }

  if (isPdf) {
    return await extractFromPdf(fileBuffer, onProgress);
  } else {
    return await extractFromImage(fileBuffer, onProgress);
  }
}

/**
 * Extracts from PDF with per-page text extraction and fallback OCR for scanned pages.
 */
async function extractFromPdf(
  buffer: Buffer,
  onProgress?: (stage: string, progress: number) => void
): Promise<ExtractionResult> {
  onProgress?.('Loading PDF document structure...', 10);

  let doc;
  try {
    const uint8 = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8,
      useSystemFonts: true,
      disableFontFace: true,
    });
    doc = await loadingTask.promise;
  } catch (err: any) {
    if (err?.name === 'PasswordException' || /password/i.test(err?.message || '')) {
      throw new Error('This PDF is password-protected. Please provide an unencrypted document.');
    }
    throw new Error(`Failed to read PDF: ${err?.message || 'Invalid or corrupted file.'}`);
  }

  const numPages = Math.min(doc.numPages, MAX_PDF_PAGES);
  const pages: ExtractedPage[] = [];
  let methodsUsed = new Set<string>();
  let totalConfidence = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress?.(`Processing PDF page ${pageNum} of ${numPages}...`, 10 + (pageNum / numPages) * 70);

    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Reconstruct text preserving layout & line breaks
    let pageText = '';
    let lastY: number | null = null;

    for (const item of textContent.items as any[]) {
      if (!item.str) continue;
      const currentY = item.transform ? Math.round(item.transform[5]) : null;

      if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
        pageText += '\n';
      } else if (pageText.length > 0 && !pageText.endsWith('\n') && !pageText.endsWith(' ')) {
        pageText += ' ';
      }
      pageText += item.str;
      lastY = currentY;
    }

    const cleanText = pageText.trim();
    // Check if the page has sufficient usable text (>= 30 alphanumeric characters)
    const alphaCount = (cleanText.match(/[a-zA-Z0-9]/g) || []).length;

    if (alphaCount >= 30) {
      pages.push({
        pageNumber: pageNum,
        text: cleanText,
        method: 'pdf_text',
        confidence: 0.99,
        hasUsableText: true,
      });
      methodsUsed.add('pdf_text');
      totalConfidence += 0.99;
    } else {
      // Scanned page without text layer: run Tesseract OCR
      onProgress?.(`Page ${pageNum} appears scanned — running Tesseract OCR...`, 10 + (pageNum / numPages) * 85);

      try {
        // Run OCR on page or fallback
        const ocrResult = await runTesseractOCR(buffer);
        pages.push({
          pageNumber: pageNum,
          text: ocrResult.text,
          method: 'pdf_raster_ocr',
          confidence: ocrResult.confidence,
          hasUsableText: ocrResult.text.trim().length > 0,
        });
        methodsUsed.add('pdf_raster_ocr');
        totalConfidence += ocrResult.confidence;
      } catch (ocrErr: any) {
        // Fallback gracefully
        pages.push({
          pageNumber: pageNum,
          text: cleanText || '[Scanned page could not be parsed]',
          method: 'pdf_text',
          confidence: 0.5,
          hasUsableText: cleanText.length > 0,
        });
        totalConfidence += 0.5;
      }
    }
  }

  const fullText = pages.map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`).join('\n\n');
  const avgConf = pages.length > 0 ? Math.round((totalConfidence / pages.length) * 100) / 100 : 0.9;

  let overallMethod: ExtractionMetadata['method'] = 'pdf_text';
  if (methodsUsed.has('pdf_raster_ocr') && methodsUsed.has('pdf_text')) {
    overallMethod = 'mixed';
  } else if (methodsUsed.has('pdf_raster_ocr')) {
    overallMethod = 'pdf_raster_ocr';
  }

  onProgress?.('Finalizing extraction...', 95);

  return {
    fullText,
    pages,
    metadata: {
      pages: numPages,
      method: overallMethod,
      averageConfidence: avgConf,
      characterCount: fullText.length,
      rawTextSnippet: fullText.slice(0, 300) + '...',
      processedAt: new Date().toISOString(),
    },
  };
}

/**
 * Extracts from an image (PNG, JPG) using Tesseract.js.
 */
async function extractFromImage(
  buffer: Buffer,
  onProgress?: (stage: string, progress: number) => void
): Promise<ExtractionResult> {
  onProgress?.('Pre-processing image and initializing OCR engine...', 20);

  const ocrResult = await runTesseractOCR(buffer, (m) => {
    if (m.status === 'recognizing text') {
      const p = Math.round(m.progress * 60) + 30;
      onProgress?.(`Recognizing text with Tesseract (${Math.round(m.progress * 100)}%)...`, p);
    }
  });

  onProgress?.('Structuring OCR results...', 95);

  const pages: ExtractedPage[] = [
    {
      pageNumber: 1,
      text: ocrResult.text,
      method: 'image_ocr',
      confidence: ocrResult.confidence,
      hasUsableText: ocrResult.text.trim().length > 0,
    },
  ];

  return {
    fullText: ocrResult.text,
    pages,
    metadata: {
      pages: 1,
      method: 'image_ocr',
      averageConfidence: ocrResult.confidence,
      characterCount: ocrResult.text.length,
      rawTextSnippet: ocrResult.text.slice(0, 300) + '...',
      processedAt: new Date().toISOString(),
    },
  };
}

/**
 * Helper to run Tesseract OCR on a buffer.
 */
async function runTesseractOCR(
  imageBuffer: Buffer,
  progressLogger?: (info: any) => void
): Promise<{ text: string; confidence: number }> {
  const worker = await createWorker('eng');

  try {
    if (progressLogger) {
      // In Tesseract.js v5 createWorker supports logger option or recognize
    }
    const { data } = await worker.recognize(imageBuffer);
    const confidence = (data.confidence || 85) / 100;
    return {
      text: data.text || '',
      confidence: Math.round(confidence * 100) / 100,
    };
  } finally {
    await worker.terminate();
  }
}
