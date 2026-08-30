'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Employee } from '@/types/employees';
import { getEmployeePhotoUrl } from '@/lib/employees/storage';

export default function EmployeesSection() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleAnimationEnd = useCallback(() => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = setTimeout(() => {
      animationTimeoutRef.current = null;
      setIsAnimating(false);
    }, 700);
  }, []);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    async function fetchEmployees() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('published', true)
          .order('order_index', { ascending: true });

        if (error) {
          console.error('Error fetching employees:', error);
        } else {
          setEmployees(data || []);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchEmployees();
  }, []);

  const goToNext = useCallback(() => {
    if (isAnimating || employees.length <= 1) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % employees.length);
    scheduleAnimationEnd();
  }, [isAnimating, employees.length, scheduleAnimationEnd]);

  const goToPrev = useCallback(() => {
    if (isAnimating || employees.length <= 1) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev - 1 + employees.length) % employees.length);
    scheduleAnimationEnd();
  }, [isAnimating, employees.length, scheduleAnimationEnd]);

  const goToCard = useCallback((index: number) => {
    if (isAnimating || index === currentIndex) return;
    setIsAnimating(true);
    setCurrentIndex(index);
    scheduleAnimationEnd();
  }, [isAnimating, currentIndex, scheduleAnimationEnd]);

  // Touch
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartX = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) goToNext();
        else goToPrev();
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [goToNext, goToPrev]);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  if (loading) {
    return (
      <section className="w-full bg-white py-16 px-8 md:px-20 font-[Montserrat,sans-serif]">
        <div className="max-w-[1100px] h-[540px] mx-auto flex items-center justify-center">
          <div className="text-[#AF5D3E]">Загрузка сотрудников...</div>
        </div>
      </section>
    );
  }

  if (employees.length === 0) {
    return (
      <section className="w-full bg-white py-16 px-8 md:px-20 font-[Montserrat,sans-serif]">
        <div className="max-w-[1100px] h-[540px] mx-auto flex items-center justify-center">
          <div className="text-[#AF5D3E] text-center">
            <p className="mb-2">Сотрудники пока не добавлены</p>
            <p className="text-sm opacity-70">Добавьте сотрудников через админ-панель</p>
          </div>
        </div>
      </section>
    );
  }

  const getCardClass = (index: number) => {
    const offset = (index - currentIndex + employees.length) % employees.length;
    if (offset === 0) return 'card-0';
    if (offset === 1) return 'card-1';
    if (offset === 2) return 'card-2';
    return '';
  };

  return (
    <section className="specialists-section">
      <div className="carousel-container" ref={containerRef}>
        {employees.map((employee, index) => {
          const fullName = employee.full_name || `${employee.first_name} ${employee.last_name}`;
          const photoUrl = employee.photo_path
            ? getEmployeePhotoUrl(employee.photo_path)
            : '';
          const roles = [
            employee.position,
            ...(employee.specialization ? employee.specialization.split(',').map(s => s.trim()) : []),
          ].filter(Boolean);

          return (
            <div
              key={employee.id}
              className={`card ${getCardClass(index)}`}
              data-index={index}
              onClick={() => {
                if (index !== currentIndex) goToCard(index);
                else goToNext();
              }}
            >
              <div className="card-photo">
                {photoUrl ? (
                  <img src={photoUrl} alt={fullName} />
                ) : (
                  <div className="w-full h-full bg-[#AF5D3E] flex items-center justify-center">
                    <svg className="w-20 h-20 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="card-content">
                <div className="card-top">
                  <div className="card-name">
                    {fullName.trim().split(/\s+/u).map((part, partIndex) => (
                      <span key={`${employee.id}-name-${partIndex}`}>
                        {partIndex > 0 && <br />}
                        {part}
                      </span>
                    ))}
                  </div>
                  <div className="card-divider" />
                  <div className="card-roles">
                    {roles.map((role, i) => (
                      <span key={i}>{role}</span>
                    ))}
                  </div>
                </div>
                <div className="card-stats">
                  <div className="stat">
                    <div className="stat-value">{employee.experience_years}+ лет</div>
                    <div className="stat-bar"><div className="stat-bar-fill" /></div>
                    <div className="stat-label">клинического опыта</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{employee.happy_patients || '0+'}</div>
                    <div className="stat-bar"><div className="stat-bar-fill" /></div>
                    <div className="stat-label">довольных пациентов</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{employee.courses_count}</div>
                    <div className="stat-bar"><div className="stat-bar-fill" /></div>
                    <div className="stat-label">курсов повышения квалификации</div>
                  </div>
                </div>
              </div>
              <div className="card-nav-hint">››</div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

        .specialists-section {
          width: 100%;
          background: #ffffff;
          padding: 60px 80px 80px 80px;
          font-family: 'Montserrat', sans-serif;
        }

        .carousel-container {
          position: relative;
          width: 100%;
          max-width: 1100px;
          height: 540px;
          margin: 0 auto;
          perspective: 1200px;
        }

        .card {
          position: absolute;
          top: 0;
          left: 50%;
          width: 820px;
          max-width: 100%;
          height: 520px;
          margin-left: -410px;
          border-radius: 32px;
          overflow: hidden;
          display: flex;
          background: #AF5D3E;
          box-shadow: 0 25px 50px rgba(0,0,0,0.3), 0 15px 30px rgba(0,0,0,0.2);
          transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          transform-origin: center center;
        }

        .card-0 {
          z-index: 3;
          transform: translate(0, 0) scale(1) rotate(0deg);
          opacity: 1;
        }

        .card-1 {
          z-index: 2;
          transform: translate(60px, 20px) scale(0.97) rotate(1deg);
          opacity: 1;
          box-shadow: 0 20px 40px rgba(0,0,0,0.25), 0 12px 24px rgba(0,0,0,0.18);
        }

        .card-2 {
          z-index: 1;
          transform: translate(120px, 40px) scale(0.94) rotate(2deg);
          opacity: 1;
          box-shadow: 0 15px 30px rgba(0,0,0,0.22), 0 8px 16px rgba(0,0,0,0.15);
        }

        .card-photo {
          width: 35%;
          min-height: 100%;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        .card-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .card-photo::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 50px;
          height: 100%;
          background: linear-gradient(to right, transparent, #AF5D3E);
        }

        .card-content {
          flex: 1;
          padding: 50px 50px 40px 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          text-align: left;
        }

        .card-top {
          height: 260px;
          display: flex;
          flex-direction: column;
        }

        .card-name {
          font-size: 32px;
          font-weight: 700;
          color: #fff;
          line-height: 1.25;
          margin-bottom: 20px;
          text-align: left;
          flex-shrink: 0;
        }

        .card-divider {
          width: 100%;
          height: 2px;
          background: rgba(255,255,255,0.5);
          margin-bottom: 24px;
          flex-shrink: 0;
        }

        .card-roles {
          font-size: 18px;
          color: rgba(255,255,255,0.95);
          line-height: 1.7;
          text-align: left;
          overflow: hidden;
        }

        .card-roles span {
          display: block;
        }

        .card-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 40px;
          align-items: start;
        }

        .stat {
          text-align: left;
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 800;
          color: #DB9844;
          margin-bottom: 8px;
          text-align: left;
          white-space: nowrap;
        }

        .stat-bar {
          width: 100%;
          height: 5px;
          background: rgba(255,255,255,0.3);
          border-radius: 3px;
          margin-bottom: 10px;
          overflow: hidden;
        }

        .stat-bar-fill {
          height: 100%;
          background: #fff;
          border-radius: 3px;
          width: 100%;
        }

        .stat-label {
          font-size: 12px;
          color: rgba(255,255,255,0.85);
          line-height: 1.4;
          text-align: left;
          min-height: 51px;
        }

        .card-nav-hint {
          position: absolute;
          right: 35px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 40px;
          color: rgba(255,255,255,0.6);
          pointer-events: none;
          font-weight: 300;
        }

        @media (max-width: 900px) {
          .specialists-section {
            padding: 40px 20px 60px 20px;
          }

          .carousel-container {
            height: auto;
            min-height: 620px;
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }

          .card {
            flex-direction: column;
            width: 360px;
            max-width: 100%;
            left: 50%;
            margin-left: -180px;
            height: auto;
            min-height: 600px;
          }

          .card-photo {
            width: 100%;
            height: 380px;
            flex-shrink: 0;
            overflow: hidden;
          }

          .card-photo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: top center;
          }

          .card-photo::after {
            width: 100%;
            height: 60px;
            top: auto;
            bottom: 0;
            background: linear-gradient(to top, #AF5D3E, transparent);
          }

          .card-content {
            padding: 24px 24px;
            text-align: center;
          }

          .card-top {
            height: auto;
          }

          .card-name {
            font-size: 22px;
            margin-bottom: 14px;
            text-align: center;
          }

          .card-divider {
            margin-bottom: 16px;
          }

          .card-roles {
            font-size: 14px;
            margin-bottom: 20px;
            text-align: center;
          }

          .card-stats {
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }

          .stat {
            text-align: center;
            display: flex;
            flex-direction: column;
          }

          .stat-value {
            font-size: 20px;
            text-align: center;
            white-space: nowrap;
          }

          .stat-label {
            font-size: 11px;
            text-align: center;
            min-height: 38px;
          }

          .card-1 {
            transform: translate(12px, 8px) scale(0.97) rotate(0.5deg);
          }

          .card-2 {
            transform: translate(24px, 16px) scale(0.94) rotate(1deg);
          }

          .card-nav-hint {
            font-size: 32px;
            right: 20px;
          }
        }

        @media (max-width: 420px) {
          .specialists-section {
            padding: 20px 12px 40px 12px;
          }

          .carousel-container {
            min-height: 560px;
          }

          .card {
            width: 310px;
            max-width: calc(100% - 24px);
            margin-left: -155px;
            min-height: 540px;
            border-radius: 20px;
          }

          .card-photo {
            height: 320px;
          }

          .card-content {
            padding: 20px 16px 24px 16px;
          }

          .card-name {
            font-size: 19px;
            margin-bottom: 12px;
          }

          .card-roles {
            font-size: 13px;
            margin-bottom: 16px;
          }

          .card-stats {
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }

          .stat {
            min-width: 0;
            display: flex;
            flex-direction: column;
          }

          .stat-value {
            font-size: 17px;
            white-space: nowrap;
          }

          .stat-label {
            font-size: 10px;
            min-height: 34px;
            text-align: center;
          }

          .card-1 {
            transform: translate(8px, 6px) scale(0.97) rotate(0.5deg);
          }

          .card-2 {
            transform: translate(16px, 12px) scale(0.94) rotate(1deg);
          }
        }

        @media (max-width: 360px) {
          .card {
            width: 280px;
            margin-left: -140px;
            min-height: 500px;
          }

          .card-photo {
            height: 280px;
          }

          .card-name {
            font-size: 17px;
          }

          .stat-value {
            font-size: 15px;
            white-space: nowrap;
            height: 22px;
          }
        }
      `}</style>
    </section>
  );
}
