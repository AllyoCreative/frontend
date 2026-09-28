import React, { useEffect, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument, TextLayer, type PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type { PDFDocumentProxy };

export interface PdfTextSelection {
  text: string;
  point: { x: number; y: number };
  rect: { x: number; y: number; width: number; height: number };
}

export const PdfPageThumb: React.FC<{
  pdfDoc: PDFDocumentProxy | null;
  pageNum: number;
  isSelected?: boolean;
}> = ({ pdfDoc, pageNum }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let active = true;

    pdfDoc.getPage(pageNum).then((page) => {
      if (!active || !canvasRef.current) return;
      const vp = page.getViewport({ scale: 1 });
      const targetWidth = 125;
      const scale = targetWidth / vp.width;
      const thumbViewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      canvas.width = Math.floor(thumbViewport.width);
      canvas.height = Math.floor(thumbViewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      page.render({
        canvas,
        canvasContext: ctx,
        viewport: thumbViewport,
      }).promise.then(() => {
        if (active) setLoaded(true);
      }).catch(() => {});
    }).catch(() => {});

    return () => {
      active = false;
    };
  }, [pdfDoc, pageNum]);

  return (
    <div className="file-review-rail-thumb-wrap">
      <canvas
        ref={canvasRef}
        style={{
          display: loaded ? 'block' : 'none',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: 5,
        }}
      />
      {!loaded && (
        <div className="file-review-rail-thumb-placeholder">
          <span>{pageNum}</span>
        </div>
      )}
    </div>
  );
};

interface PdfReviewCanvasProps {
  url: string;
  altName: string;
  currentPage?: number;
  zoom?: number;
  onDimensions?: (dim: { width: number; height: number }) => void;
  onNumPages?: (numPages: number) => void;
  onDocLoaded?: (doc: PDFDocumentProxy) => void;
  onTextSelect?: (sel: PdfTextSelection | null) => void;
}

export const PdfReviewCanvas: React.FC<PdfReviewCanvasProps> = ({
  url,
  altName,
  currentPage = 1,
  zoom = 100,
  onDimensions,
  onNumPages,
  onDocLoaded,
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
        if (onDocLoaded) onDocLoaded(doc);
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
        const baseWidth = Math.round(baseViewport.width);
        const baseHeight = Math.round(baseViewport.height);

        if (onDimensions) {
          onDimensions({ width: baseWidth, height: baseHeight });
        }

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const renderViewport = page.getViewport({ scale: Math.max(1, pixelRatio * 1.5) });
        const textViewport = page.getViewport({ scale: 1 });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);

        renderTask = page.render({
          canvas,
          canvasContext: ctx,
          viewport: renderViewport,
        });
        await renderTask.promise;

        if (textLayerRef.current && active) {
          textLayerRef.current.innerHTML = '';
          textLayerRef.current.style.width = `${baseWidth}px`;
          textLayerRef.current.style.height = `${baseHeight}px`;
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 380, color: '#8e8e93', width: '100%', height: '100%' }}>
        <p style={{ margin: 0, fontSize: 13 }}>Carregando visualização interativa do PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#ff453a', width: '100%' }}>
        <p>{error}</p>
        {url && <a href={url} target="_blank" rel="noreferrer" style={{ color: '#004c46', textDecoration: 'underline', fontSize: 12, fontWeight: 700 }}>Baixar PDF original</a>}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        userSelect: 'text',
        overflow: 'hidden',
        borderRadius: 5,
        background: '#fff',
        boxShadow: '0 10px 30px rgba(13,30,29,.12)',
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label={`PDF ${altName}`}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          borderRadius: 5,
          pointerEvents: 'none',
          objectFit: 'contain',
        }}
      />
      <div
        ref={textLayerRef}
        className="textLayer"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top left',
          pointerEvents: 'auto',
          userSelect: 'text',
        }}
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
