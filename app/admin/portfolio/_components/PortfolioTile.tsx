'use client';

import Link from 'next/link';
import { PortfolioItem } from '@/types/portfolio';
import Button from '@/components/ui/Button';
import DeletePortfolioButton from './DeletePortfolioButton';

interface PortfolioTileProps {
  project: PortfolioItem;
  isDragging?: boolean;
  onDeleted?: (id: string) => void;
}

export default function PortfolioTile({ project, isDragging, onDeleted }: PortfolioTileProps) {
  return (
    <div
      className={`relative bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden group cursor-move transition-all ${
        isDragging ? 'opacity-50 scale-95' : 'hover:border-[#DB9844]/50'
      }`}
      style={{
        height: `${project.tile_height}px`,
      }}
    >
      {/* Image */}
      {project.image_url && (
        <div className="absolute inset-0">
          <img
            src={project.image_url}
            alt={project.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            style={{
              objectPosition: `${project.cover_x}% ${project.cover_y}%`,
              transform: `scale(${project.cover_zoom})`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        </div>
      )}

      {/* Content */}
      <div className="relative h-full p-6 flex flex-col justify-end">
        {/* Category badge */}
        {project.category && (
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 bg-[#DB9844]/90 backdrop-blur-sm text-white text-xs font-medium rounded-full">
              {project.category}
            </span>
          </div>
        )}

        {/* Drag indicator */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-2 bg-slate-800/80 backdrop-blur-sm rounded-lg">
            <svg
              className="w-4 h-4 text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8h16M4 16h16"
              />
            </svg>
          </div>
        </div>

        {/* Title and subtitle */}
        <div className="mb-3">
          <h3 className="text-lg font-bold text-white mb-1">{project.title}</h3>
          {project.subtitle && (
            <p className="text-sm text-slate-300">{project.subtitle}</p>
          )}
        </div>

        {/* Technologies */}
        {project.technologies && project.technologies.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {project.technologies.slice(0, 3).map((tech, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-slate-900/50 backdrop-blur-sm text-slate-300 text-xs rounded"
              >
                {tech}
              </span>
            ))}
            {project.technologies.length > 3 && (
              <span className="px-2 py-1 bg-slate-900/50 backdrop-blur-sm text-slate-300 text-xs rounded">
                +{project.technologies.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/admin/portfolio/${project.id}`} className="flex-1">
            <Button variant="secondary" size="sm" className="w-full">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Редактировать
            </Button>
          </Link>
          <DeletePortfolioButton id={project.id} title={project.title} onDeleted={onDeleted} />
        </div>

        {/* Grid size indicator */}
        <div className="absolute bottom-4 right-4 text-xs text-slate-400 opacity-50">
          {project.col_span} кол. × {project.tile_height}px
        </div>
      </div>

      {/* Visibility indicator */}
      {!project.visible && (
        <div className="absolute top-4 right-4">
          <div className="p-2 bg-slate-900/90 backdrop-blur-sm rounded-lg">
            <svg
              className="w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
