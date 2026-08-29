import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import EmployeeForm from '../_components/EmployeeForm';
import type { Employee } from '@/types/employees';

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !employee) {
    notFound();
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Редактировать сотрудника</h1>
        <p className="text-slate-400">Обновите информацию о сотруднике</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <EmployeeForm employee={employee as Employee} />
      </div>
    </>
  );
}
