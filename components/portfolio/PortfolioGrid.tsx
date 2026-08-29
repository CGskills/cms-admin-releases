'use client';

import { Fragment, useState, useRef, useEffect, useCallback } from 'react';

interface PortfolioItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  before_image: string | null;
  after_image: string | null;
  category: string | null;
  col_span: number;
  tile_height: number;
  cover_x: number;
  cover_y: number;
  cover_zoom: number;
}

interface PortfolioGridProps {
  items: PortfolioItem[];
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripMarkup(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>(?=.)/gi, '\n')
      .replace(/<[^>]*>/g, '')
  );
}

/** Render the structured description without executing database-provided HTML. */
function SafeDescription({ value }: { value: string }) {
  const matches = value.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi);
  const paragraphs = matches && matches.length > 0 ? matches : [value];

  return (
    <>
      {paragraphs.map((paragraph, paragraphIndex) => {
        const inner = paragraph
          .replace(/^<p\b[^>]*>/i, '')
          .replace(/<\/p>$/i, '');
        const segments = inner.split(/(<strong\b[^>]*>[\s\S]*?<\/strong>)/gi);

        return (
          <p key={paragraphIndex}>
            {segments.map((segment, segmentIndex) => {
              const text = stripMarkup(segment);
              if (!text) return null;
              const key = `${paragraphIndex}-${segmentIndex}`;
              return /^<strong\b/i.test(segment) ? (
                <strong key={key}>{text}</strong>
              ) : (
                <Fragment key={key}>{text}</Fragment>
              );
            })}
          </p>
        );
      })}
    </>
  );
}

export default function PortfolioGrid({ items }: PortfolioGridProps) {
  const [modalItem, setModalItem] = useState<PortfolioItem | null>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const visibleItems = items.filter((i) => i.image_url);

  const updateSlider = useCallback((clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, pct)));
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      updateSlider(x);
    };
    const handleUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, updateSlider]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalItem(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (visibleItems.length === 0) return null;

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-12 gap-3 md:gap-4">
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className="group relative rounded-2xl overflow-hidden cursor-pointer"
            style={{
              gridColumn: `span ${item.col_span}`,
              height: `${item.tile_height}px`,
            }}
            onClick={() => {
              setModalItem(item);
              setSliderPos(50);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setModalItem(item);
                setSliderPos(50);
              }
            }}
            aria-label={`View ${item.title}`}
          >
            <div
              className="absolute inset-0 bg-cover bg-no-repeat transition-transform duration-500 group-hover:scale-105"
              style={{
                backgroundImage: `url('${item.image_url}')`,
                backgroundPosition: `${item.cover_x}% ${item.cover_y}%`,
                transform: `scale(${item.cover_zoom})`,
                transformOrigin: `${item.cover_x}% ${item.cover_y}%`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-end p-4 md:p-6 z-10">
              {item.category && (
                <span className="text-[11px] font-bold tracking-widest uppercase text-[#DB9844] mb-1">
                  {item.category}
                </span>
              )}
              <h3 className="text-white font-extrabold text-base md:text-lg leading-tight">
                {item.title}
              </h3>
              <span className="text-[#DB9844] text-xl mt-1 transition-transform group-hover:translate-x-1">
                &#8250;
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalItem && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => setModalItem(null)}
          />
          <div className="relative z-10 bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-10 shadow-2xl">
            <button
              onClick={() => setModalItem(null)}
              className="absolute top-4 right-4 w-11 h-11 rounded-full bg-gray-100 hover:bg-[#DB9844] hover:text-white text-gray-800 flex items-center justify-center transition-all"
              aria-label="Close"
            >
              &#10005;
            </button>

            <div className="text-center mb-6">
              <p className="text-xs font-bold tracking-widest uppercase text-[#a96418] mb-2">Portfolio</p>
              <h3 className="text-2xl md:text-3xl font-extrabold text-[#2f2013] tracking-tight">
                {modalItem.title}
              </h3>
              {modalItem.subtitle && (
                <p className="text-sm text-[#755b45] mt-2">{modalItem.subtitle}</p>
              )}
            </div>

            {/* Before/After Slider */}
            {modalItem.before_image && modalItem.after_image && (
              <div
                ref={sliderRef}
                className="relative w-full rounded-2xl overflow-hidden cursor-ew-resize mb-6 shadow-lg"
                style={{ aspectRatio: '16/9' }}
                onMouseDown={(e) => {
                  setIsDragging(true);
                  updateSlider(e.clientX);
                }}
                onTouchStart={(e) => {
                  setIsDragging(true);
                  updateSlider(e.touches[0].clientX);
                }}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center z-[1]"
                  style={{ backgroundImage: `url('${modalItem.after_image}')` }}
                />
                <div
                  className="absolute inset-0 bg-cover bg-center z-[2]"
                  style={{
                    backgroundImage: `url('${modalItem.before_image}')`,
                    clipPath: `inset(0 calc(100% - ${sliderPos}%) 0 0)`,
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white z-10 pointer-events-none"
                  style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center gap-1">
                    <span className="text-[#a96418] font-bold text-sm">&#8249;</span>
                    <span className="text-[#a96418] font-bold text-sm">&#8250;</span>
                  </div>
                </div>
                <span className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-white/90 text-[11px] font-bold tracking-wider uppercase text-[#755b45] z-[3] pointer-events-none">
                  Before
                </span>
                <span className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-[#DB9844] text-[11px] font-bold tracking-wider uppercase text-white z-[3] pointer-events-none">
                  After
                </span>
              </div>
            )}

            {/* Description */}
            {modalItem.description && (
              <div
                className="bg-[#fbf7f1] rounded-2xl p-5 border-l-4 border-[#DB9844] [&_p]:text-sm [&_p]:text-[#2f2013] [&_p]:leading-relaxed [&_p]:font-medium [&_p]:mb-2.5 [&_p:last-child]:mb-0 [&_p]:whitespace-pre-line [&_strong]:text-[#a96418] [&_strong]:font-bold"
              >
                <SafeDescription value={modalItem.description} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
