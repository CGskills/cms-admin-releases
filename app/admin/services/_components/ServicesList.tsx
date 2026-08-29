'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import DeleteServiceButton from './DeleteServiceButton';

interface ServiceRow {
  id: string;
  title: string;
  description: string;
  icon: string | null;
}

interface ServicesListProps {
  initialServices: ServiceRow[];
}

function EmptyServicesState() {
  return (
    <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-12 text-center">
      <div className="w-16 h-16 bg-[#DB9844]/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-[#DB9844]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-white mb-2">No services yet</h3>
      <p className="text-slate-400 mb-6">Get started by adding your first service</p>
      <Link href="/admin/services/new">
        <Button>Add Your First Service</Button>
      </Link>
    </div>
  );
}

export default function ServicesList({ initialServices }: ServicesListProps) {
  const [services, setServices] = useState(initialServices);

  if (services.length === 0) {
    return <EmptyServicesState />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map((service) => (
        <div key={service.id} className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 hover:border-[#DB9844]/50 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#DB9844]/10 rounded-lg flex items-center justify-center text-[#DB9844] text-lg">
              {service.icon || '⚙'}
            </div>
            <h3 className="text-lg font-bold text-white">{service.title}</h3>
          </div>
          <p className="text-slate-400 text-sm mb-4 line-clamp-3">{service.description}</p>
          <div className="flex gap-2">
            <Link href={`/admin/services/${service.id}`} className="flex-1">
              <Button variant="secondary" size="sm" className="w-full">Edit</Button>
            </Link>
            <DeleteServiceButton
              id={service.id}
              title={service.title}
              onDeleted={(id) => setServices((current) => current.filter((item) => item.id !== id))}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
