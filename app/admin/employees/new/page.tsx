import EmployeeForm from '../_components/EmployeeForm';

export default function NewEmployeePage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Добавить сотрудника</h1>
        <p className="text-slate-400">Заполните информацию о новом сотруднике</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <EmployeeForm />
      </div>
    </>
  );
}
