'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Testimonial } from '@/types/testimonials';
import { getTestimonialImageUrl } from '@/lib/testimonials/storage';

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [perView, setPerView] = useState(3);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState('');
  const [isQrOpen, setIsQrOpen] = useState(false);
  
  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const modalResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const GAP = 30;

  useEffect(() => {
    return () => {
      if (modalResetTimeoutRef.current) {
        clearTimeout(modalResetTimeoutRef.current);
        modalResetTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    async function fetchTestimonials() {
      try {
        const supabase = createClient();
        
        const { data, error } = await supabase
          .from('testimonials')
          .select('*')
          .eq('published', true)
          .order('order_index', { ascending: true });

        if (error) {
          console.error('Error fetching testimonials:', error);
        } else {
          setTestimonials(data || []);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTestimonials();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setPerView(w <= 768 ? 1 : w <= 1024 ? 2 : 3);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalPages = Math.ceil(testimonials.length / perView);

  const moveCarousel = useCallback(() => {
    if (!trackRef.current || !viewportRef.current) return;
    const cardWidth = trackRef.current.children[0]?.clientWidth || 0;
    trackRef.current.style.transform = `translateX(-${page * perView * (cardWidth + GAP)}px)`;
  }, [page, perView]);

  useEffect(() => {
    moveCarousel();
  }, [moveCarousel, testimonials]);

  useEffect(() => {
    document.body.style.overflow = isModalOpen || isQrOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen, isQrOpen]);

  const handlePrev = () => setPage((p) => (p < 0 ? totalPages - 1 : p - 1));
  const handleNext = () => setPage((p) => (p >= totalPages - 1 ? 0 : p + 1));

  const openModal = (screenshotPath: string | null) => {
    if (!screenshotPath) return;
    setModalImage(getTestimonialImageUrl(screenshotPath));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    if (modalResetTimeoutRef.current) {
      clearTimeout(modalResetTimeoutRef.current);
    }
    modalResetTimeoutRef.current = setTimeout(() => {
      modalResetTimeoutRef.current = null;
      setModalImage('');
    }, 350);
  };

  const openQr = () => {
    setIsQrOpen(true);
  };

  const closeQr = () => {
    setIsQrOpen(false);
  };

  if (loading) {
    return (
      <section className="bg-[#BCAEA7] min-h-screen flex items-center justify-center py-20 px-4">
        <div className="text-[#5C3328]">Загрузка отзывов...</div>
      </section>
    );
  }

  if (testimonials.length === 0) {
    return (
      <section className="bg-[#BCAEA7] min-h-screen flex items-center justify-center py-20 px-4">
        <div className="text-[#5C3328] text-center">
          <p className="mb-2">Отзывы пока не добавлены</p>
          <p className="text-sm opacity-70">Добавьте отзывы через админ-панель и опубликуйте их</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-[#BCAEA7] min-h-screen flex flex-col justify-center py-16 px-4 md:px-8 relative overflow-hidden">
      <div className="absolute rounded-full opacity-6 pointer-events-none bg-[#5C3328] w-[400px] h-[400px] top-[-150px] right-[-100px]" />
      <div className="absolute rounded-full opacity-6 pointer-events-none bg-[#5C3328] w-[300px] h-[300px] bottom-[-100px] left-[-80px]" />

      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col justify-center">
        <h2 className="text-center text-[2.6rem] font-bold text-[#5C3328] mb-3 tracking-tight">
          Отзывы наших пациентов
        </h2>
        <p className="text-center text-[1.05rem] text-[rgba(92,51,40,0.6)] mb-14 font-normal">
          Нам доверяют своё здоровье и улыбку
        </p>

        <div className="flex items-center gap-4">
          <button
            onClick={handlePrev}
            className="flex-shrink-0 w-12 h-12 bg-transparent border-none cursor-pointer flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
            aria-label="Предыдущие"
          >
            <svg viewBox="0 0 24 24" className="w-10 h-10 stroke-[#5C3328] stroke-[3] fill-none">
              <polyline points="15 18 9 12 15 6" />
              <polyline points="9 18 3 12 9 6" transform="translate(6,0)" />
            </svg>
          </button>

          <div
            ref={viewportRef}
            className="flex-1 overflow-hidden rounded-[20px] cursor-grab active:cursor-grabbing"
          >
            <div
              ref={trackRef}
              className="flex transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] gap-[30px]"
            >
              {testimonials.map((testimonial, index) => (
                <div
                  key={testimonial.id}
                  className="min-w-[calc((100%-60px)/3)] bg-white rounded-[28px] p-8 flex flex-col items-center opacity-0 translate-y-10 animate-[cardIn_0.7s_cubic-bezier(0.22,1,0.36,1)_forwards]"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className="flex justify-center gap-2 mb-5">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-[34px] h-[34px]">
                        <svg
                          viewBox="0 0 24 24"
                          fill="#d4a04a"
                          className="w-full h-full"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </div>
                    ))}
                  </div>

                  <p className="text-[0.88rem] leading-[1.65] text-[#5C3328] text-center flex-1 mb-4 font-normal">
                    {testimonial.content}
                  </p>

                  {testimonial.screenshot_path && (
                    <button
                      onClick={() => openModal(testimonial.screenshot_path || null)}
                      className="block text-center text-[#DB9844] text-[0.95rem] font-semibold text-decoration-none pt-4 border-t border-[#f0ebe5] w-full hover:text-[#c48535] hover:-translate-y-0.5 transition-all cursor-pointer"
                    >
                      Смотреть оригинал
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleNext}
            className="flex-shrink-0 w-12 h-12 bg-transparent border-none cursor-pointer flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
            aria-label="Следующие"
          >
            <svg viewBox="0 0 24 24" className="w-10 h-10 stroke-[#5C3328] stroke-[3] fill-none">
              <polyline points="9 18 15 12 9 6" />
              <polyline points="15 18 21 12 15 6" transform="translate(-6,0)" />
            </svg>
          </button>
        </div>

        <div className="text-center mt-12">
          <button
            onClick={openQr}
            className="inline-block px-12 py-4 bg-[#5C3328] text-white font-semibold text-[1rem] border-none rounded-[50px] cursor-pointer hover:bg-[#4a2820] hover:-translate-y-0.5 hover:shadow-lg transition-all"
          >
            Больше отзывов
          </button>
        </div>
      </div>

      {/* QR Modal */}
      {isQrOpen && (
        <div
          className="fixed inset-0 bg-[rgba(30,20,15,0.85)] backdrop-blur-sm flex items-center justify-center z-50 p-5 opacity-0 animate-[fadeIn_0.35s_forwards]"
          onClick={closeQr}
        >
          <div
            className="bg-[rgba(255,255,255,0.15)] backdrop-blur-xl border border-[rgba(255,255,255,0.25)] rounded-[28px] p-11 max-w-[780px] w-full relative transform scale-95 translate-y-4 animate-[modalIn_0.35s_cubic-bezier(0.34,1.56,0.64,1)_forwards]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeQr}
              className="absolute top-4 right-4 w-11 h-11 rounded-full bg-[rgba(255,255,255,0.15)] border border-[rgba(255,255,255,0.2)] cursor-pointer flex items-center justify-center hover:bg-[rgba(255,255,255,0.3)] hover:rotate-90 hover:scale-110 transition-all"
              aria-label="Закрыть"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-white stroke-[2.5] fill-none">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h3 className="text-center text-[1.35rem] font-bold text-white mb-8">
              Найдите нас на площадках
            </h3>
            <div className="flex justify-center gap-7 flex-wrap">
              <a
                href="https://2gis.ru/tula/firm/70000001112917766"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[rgba(255,255,255,0.1)] backdrop-blur-sm border border-[rgba(255,255,255,0.15)] rounded-[22px] p-5 flex flex-col items-center gap-3 min-w-[180px] hover:bg-[rgba(255,255,255,0.2)] hover:-translate-y-1 transition-all cursor-pointer"
              >
                <div className="w-[150px] h-[150px] rounded-[14px] overflow-hidden bg-[rgba(255,255,255,0.12)] flex items-center justify-center border border-[rgba(255,255,255,0.1)]">
                  <img
                    src="https://i.postimg.cc/VkssbSLd/2gis-qr.png"
                    alt="2GIS QR"
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <span className="text-[0.88rem] font-semibold text-white text-center py-1.5 px-4 rounded-[20px] bg-[rgba(255,255,255,0.12)]">
                  2GIS
                </span>
              </a>
              <a
                href="https://yandex.ru/maps/org/amber/196183565720/?ll=37.564231%2C54.168193&z=16"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[rgba(255,255,255,0.1)] backdrop-blur-sm border border-[rgba(255,255,255,0.15)] rounded-[22px] p-5 flex flex-col items-center gap-3 min-w-[180px] hover:bg-[rgba(255,255,255,0.2)] hover:-translate-y-1 transition-all cursor-pointer"
              >
                <div className="w-[150px] h-[150px] rounded-[14px] overflow-hidden bg-[rgba(255,255,255,0.12)] flex items-center justify-center border border-[rgba(255,255,255,0.1)]">
                  <img
                    src="https://i.postimg.cc/5N4yVFVs/andeks.jpg"
                    alt="Яндекс Карты QR"
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <span className="text-[0.88rem] font-semibold text-white text-center py-1.5 px-4 rounded-[20px] bg-[rgba(255,255,255,0.12)]">
                  Яндекс Карты
                </span>
              </a>
              <a
                href="https://prodoctorov.ru/tula/lpu/114160-amber"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[rgba(255,255,255,0.1)] backdrop-blur-sm border border-[rgba(255,255,255,0.15)] rounded-[22px] p-5 flex flex-col items-center gap-3 min-w-[180px] hover:bg-[rgba(255,255,255,0.2)] hover:-translate-y-1 transition-all cursor-pointer"
              >
                <div className="w-[150px] h-[150px] rounded-[14px] overflow-hidden bg-[rgba(255,255,255,0.12)] flex items-center justify-center border border-[rgba(255,255,255,0.1)]">
                  <img
                    src="https://i.postimg.cc/CLh5gfgJ/prodoktorv.jpg"
                    alt="ПроДокторов QR"
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
                <span className="text-[0.88rem] font-semibold text-white text-center py-1.5 px-4 rounded-[20px] bg-[rgba(255,255,255,0.12)]">
                  ПроДокторов
                </span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-[rgba(30,20,15,0.85)] backdrop-blur-sm flex items-center justify-center z-[1001] p-5 opacity-0 animate-[fadeIn_0.35s_forwards]"
          onClick={closeModal}
        >
          <div
            className="relative max-w-[600px] w-full max-h-[90vh] bg-white rounded-[20px] overflow-hidden transform scale-95 translate-y-4 animate-[modalIn_0.35s_cubic-bezier(0.34,1.56,0.64,1)_forwards]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 w-11 h-11 rounded-full bg-[rgba(255,255,255,0.95)] border-none cursor-pointer flex items-center justify-center hover:rotate-90 hover:scale-110 transition-all shadow-lg z-10"
              aria-label="Закрыть"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[#5C3328] stroke-[2.5] fill-none">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <img
              src={modalImage}
              alt="Оригинал отзыва"
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes cardIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          to {
            opacity: 1;
          }
        }
        @keyframes modalIn {
          to {
            transform: none;
          }
        }
        @media (max-width: 1024px) {
          .review-card {
            min-width: calc((100% - 30px) / 2);
          }
        }
        @media (max-width: 768px) {
          .review-card {
            min-width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
