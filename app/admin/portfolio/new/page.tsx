import PortfolioForm from '../_components/PortfolioForm';

export default function NewPortfolioPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Новый проект</h1>
        <p className="text-slate-400">Создайте проект портфолио с настройкой макета</p>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
        <PortfolioForm />
      </div>
    </>
  );
}
