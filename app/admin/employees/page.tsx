import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import EmployeesList from './_components/EmployeesList';

export default async function EmployeesPage() {
  const supabase = await createClient();

  const { data: employees, error } = await supabase
    .from('employees')
    .select('*')
    .order('order_index', { ascending: true });

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Сотрудники</h1>
          <p className="text-slate-400">Управляйте карточками сотрудников</p>
        </div>
        <Link href="/admin/employees/new">
          <Button>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить сотрудника
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
          Ошибка загрузки сотрудников: {error.message}
        </div>
      )}

      {!employees || employees.length === 0 ? (
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-12 text-center">
          <div className="w-16 h-16 bg-[#DB9844]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#DB9844]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Нет сотрудников</h3>
          <p className="text-slate-400 mb-6">
            Добавьте первого сотрудника
          </p>
          <Link href="/admin/employees/new">
            <Button>Добавить первого сотрудника</Button>
          </Link>
        </div>
      ) : (
        <EmployeesList initialEmployees={employees} />
      )}
    </>
  );
}
