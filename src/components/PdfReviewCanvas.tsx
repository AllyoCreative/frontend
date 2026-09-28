import React, { useEffect, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument, TextLayer, type PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import 'pdfjs-dist/web/pdf_viewer.css';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PdfTextSelection {
  text: string;
  point: { x: number; y: number };
  rect: { x: number; y: number; width: number; height: number };
}

interface PdfReviewCanvasProps {
  url: string;
  altName: string;
  currentPage?: number;
  onDimensions?: (dim: { width: number; height: number }) => void;
  onNumPages?: (numPages: number) => void;
  onTextSelect?: (sel: PdfTextSelection | null) => void;
}

export const PdfReviewCanvas: React.FC<PdfReviewCanvasProps> = ({
  url,
  altName,
  currentPage = 1,
  onDimensions,
  onNumPages,
  onTextSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setPdfDoc(null);

    const task = getDocument({ url });
    task.promise
      .then((doc) => {
        if (!active) return;
        setPdfDoc(doc);
        setLoading(false);
        if (onNumPages) onNumPages(doc.numPages);
      })
      .catch((err) => {
        if (!active) return;
        console.error('[PdfReviewCanvas] Erro ao carregar PDF:', err);
        setError('Não foi possível carregar o PDF.');
        setLoading(false);
      });

    return () => {
      active = false;
      task.destroy().catch(() => {});
    };
  }, [url]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let active = true;
    let renderTask: any = null;

    const render = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (!active || !canvasRef.current) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(1, 2000 / Math.max(baseViewport.width, baseViewport.height));
        const displayWidth = Math.round(baseViewport.width * scale);
        const displayHeight = Math.round(baseViewport.height * scale);

        if (onDimensions) {
          onDimensions({ width: displayWidth, height: displayHeight });
        }

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const renderViewport = page.getViewport({ scale: scale * pixelRatio });
        const textViewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        renderTask = page.render({
          canvas, canvasContext: ctx,
          viewport: renderViewport,
        });
        await renderTask.promise;

        if (textLayerRef.current && active) {
          textLayerRef.current.innerHTML = '';
          textLayerRef.current.style.width = `${displayWidth}px`;
          textLayerRef.current.style.height = `${displayHeight}px`;
          const textContent = await page.getTextContent();
          const layer = new TextLayer({
            textContentSource: textContent,
            container: textLayerRef.current,
            viewport: textViewport,
          });
          await layer.render();
        }
      } catch (err: any) {
        if (!active && err?.name === 'RenderingCancelledException') return;
        console.warn('[PdfReviewCanvas] Erro ao renderizar página:', err);
      }
    };

    render();

    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [pdfDoc, currentPage]);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (text.length < 2) return;

    try {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();

      const point = {
        x: Math.max(0, Math.min(100, ((rect.left + rect.width / 2 - cRect.left) / cRect.width) * 100)),
        y: Math.max(0, Math.min(100, ((rect.top - cRect.top) / cRect.height) * 100)),
      };
      const highlightRect = {
        x: Math.max(0, Math.min(100, ((rect.left - cRect.left) / cRect.width) * 100)),
        y: Math.max(0, Math.min(100, ((rect.top - cRect.top) / cRect.height) * 100)),
        width: Math.max(1, Math.min(100, (rect.width / cRect.width) * 100)),
        height: Math.max(1, Math.min(100, (rect.height / cRect.height) * 100)),
      };

      if (onTextSelect) {
        onTextSelect({ text, point, rect: highlightRect });
      }
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 380, color: '#8e8e93' }}>
        <p style={{ margin: 0, fontSize: 13 }}>Carregando visualização interativa do PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#ff453a' }}>
        <p>{error}</p>
        {url && <a href={url} target="_blank" rel="noreferrer" style={{ color: '#fff', textDecoration: 'underline', fontSize: 12 }}>Baixar PDF original</a>}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      style={{ position: 'relative', display: 'inline-block', userSelect: 'text' }}
    >
      <canvas
        ref={canvasRef}
        aria-label={`PDF ${altName}`}
        style={{ display: 'block', borderRadius: 8, pointerEvents: 'none' }}
      />
      <div
        ref={textLayerRef}
        className="textLayer"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', userSelect: 'text' }}
      />
      <style>{`
        .textLayer {
          position: absolute;
          inset: 0;
          overflow: hidden;
          line-height: 1;
          user-select: text;
          -webkit-user-select: text;
        }
        .textLayer > span, .textLayer span {
          color: transparent !important;
          position: absolute;
          white-space: pre;
          cursor: text;
          transform-origin: 0% 0%;
        }
        .textLayer ::selection {
          background: rgba(245, 158, 11, 0.45) !important;
          color: transparent !important;
        }
      `}</style>
    </div>
  );
};
