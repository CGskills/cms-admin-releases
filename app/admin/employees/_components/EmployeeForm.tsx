'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ImageUpload from './ImageUpload';
import { createEmployee, deleteEmployeePhotoAction, updateEmployee } from '../actions';
import { getEmployeePhotoUrl } from '@/lib/employees/storage';
import type { Employee } from '@/types/employees';

interface EmployeeFormProps {
  employee?: Employee;
}

export default function EmployeeForm({ employee }: EmployeeFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [published, setPublished] = useState(employee?.published ?? false);
  const initialPhotoPath = employee?.photo_path || null;
  const initialPhotoUrl = initialPhotoPath ? getEmployeePhotoUrl(initialPhotoPath) : null;
  const [photoPath, setPhotoPath] = useState(initialPhotoPath);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [uploadedPhotoPaths, setUploadedPhotoPaths] = useState<string[]>([]);

  const [firstName, setFirstName] = useState(employee?.first_name || '');
  const [lastName, setLastName] = useState(employee?.last_name || '');
  const [position, setPosition] = useState(employee?.position || '');
  const [specialization, setSpecialization] = useState(employee?.specialization || '');
  const [experienceYears, setExperienceYears] = useState(employee?.experience_years ?? 0);
  const [happyPatients, setHappyPatients] = useState(employee?.happy_patients || '');
  const [coursesCount, setCoursesCount] = useState(employee?.courses_count ?? 0);

  const fullName = `${firstName} ${lastName}`.trim();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData(e.currentTarget);
      formData.set('full_name', fullName);
      formData.set('published', String(published));
      formData.set('photo_path', photoPath || '');
      formData.set('uploaded_paths', JSON.stringify(uploadedPhotoPaths));
      formData.set('description', employee?.description || '');
      formData.set('short_description', employee?.short_description || '');
      formData.set('education', employee?.education || '');
      formData.set('qualification', employee?.qualification || '');
      formData.set('certificates_count', String(employee?.certificates_count ?? 0));
      formData.set('achievements', employee?.achievements || '');

      if (employee) {
        await updateEmployee(employee.id, formData);
      } else {
        await createEmployee(formData);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Произошла ошибка';
      setError(message);
      // The server action rolls back uploads when validation or the database
      // mutation fails. Restore the persisted image so the form cannot submit
      // a URL that no longer exists on a subsequent attempt.
      setPhotoPath(initialPhotoPath);
      setPhotoUrl(initialPhotoUrl);
      setUploadedPhotoPaths([]);
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (isSubmitting) return;

    await Promise.allSettled(
      uploadedPhotoPaths
        .filter((path) => path !== initialPhotoPath)
        .map((path) => deleteEmployeePhotoAction(path)),
    );
    router.back();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Photo */}
        <ImageUpload
          currentPath={photoPath}
          currentUrl={photoUrl}
          employeeId={employee?.id}
          label="Фотография сотрудника"
           onUpload={(path, url) => {
             setPhotoPath(path);
             setPhotoUrl(url);
             setUploadedPhotoPaths((paths) => paths.includes(path) ? paths : [...paths, path]);
           }}
          onDelete={() => {
            setPhotoPath(null);
            setPhotoUrl(null);
          }}
        />

        {/* Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Имя *"
            name="first_name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Светлана"
            required
            disabled={isSubmitting}
          />
          <Input
            label="Фамилия *"
            name="last_name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Киселева"
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Position & Specialization */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Должность *"
            name="position"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="Главный врач"
            required
            disabled={isSubmitting}
          />
          <Input
            label="Специализация"
            name="specialization"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            placeholder="Стоматолог-терапевт, Стоматолог-ортопед"
            disabled={isSubmitting}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Опыт (лет) *"
            name="experience_years"
            type="number"
            value={experienceYears}
            onChange={(e) => setExperienceYears(parseInt(e.target.value) || 0)}
            min={0}
            required
            disabled={isSubmitting}
          />
          <Input
            label="Довольные пациенты"
            name="happy_patients"
            value={happyPatients}
            onChange={(e) => setHappyPatients(e.target.value)}
            placeholder="40 000+"
            disabled={isSubmitting}
          />
          <Input
            label="Курсов повышения квалификации"
            name="courses_count"
            type="number"
            value={coursesCount}
            onChange={(e) => setCoursesCount(parseInt(e.target.value) || 0)}
            min={0}
            disabled={isSubmitting}
          />
        </div>

        {/* Published */}
        <div className="flex items-center gap-3">
          <input
            type="hidden"
            name="published"
            value={published ? 'true' : 'false'}
          />
          <input
            type="checkbox"
            id="published"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            disabled={isSubmitting}
            className="w-5 h-5 rounded border-slate-600 bg-slate-900/50 text-[#DB9844] focus:ring-[#DB9844] focus:ring-offset-0 disabled:opacity-50"
          />
          <label htmlFor="published" className="text-sm text-slate-300">
            Опубликовать (будет виден на сайте)
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {employee ? 'Обновить сотрудника' : 'Добавить сотрудника'}
          </Button>
        </div>
      </form>

      {/* Preview */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-4">Превью карточки</label>
        <div className="rounded-2xl overflow-hidden bg-[#AF5D3E] shadow-xl">
          <div className="flex flex-col md:flex-row">
            {/* Photo */}
            <div className="w-full md:w-[35%] h-48 md:h-auto relative overflow-hidden flex-shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full min-h-[200px] bg-[#AF5D3E] flex items-center justify-center">
                  <svg className="w-16 h-16 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <div className="absolute top-0 right-0 w-[50px] h-full bg-gradient-to-r from-transparent to-[#AF5D3E] hidden md:block" />
              <div className="absolute bottom-0 left-0 w-full h-[60px] bg-gradient-to-t from-[#AF5D3E] to-transparent md:hidden" />
            </div>

            {/* Content */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-between text-left">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
                  {fullName || 'Имя Фамилия'}
                </h3>
                <div className="w-full h-0.5 bg-white/50 mb-4" />
                <div className="text-sm md:text-base text-white/90 leading-relaxed">
                  {position && <span className="block">{position}</span>}
                  {specialization && specialization.split(',').map((s, i) => (
                    <span key={i} className="block">{s.trim()}</span>
                  ))}
                  {!position && !specialization && <span className="text-white/50">Должность</span>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-left">
                  <div className="text-lg md:text-xl font-extrabold text-[#DB9844] mb-1">
                    {experienceYears}+ лет
                  </div>
                  <div className="w-full h-1 bg-white/30 rounded mb-2">
                    <div className="h-full bg-white rounded w-full" />
                  </div>
                  <div className="text-[10px] md:text-xs text-white/80 leading-tight">
                    клинического опыта
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-lg md:text-xl font-extrabold text-[#DB9844] mb-1">
                    {happyPatients || '0+'}
                  </div>
                  <div className="w-full h-1 bg-white/30 rounded mb-2">
                    <div className="h-full bg-white rounded w-full" />
                  </div>
                  <div className="text-[10px] md:text-xs text-white/80 leading-tight">
                    довольных пациентов
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-lg md:text-xl font-extrabold text-[#DB9844] mb-1">
                    {coursesCount}
                  </div>
                  <div className="w-full h-1 bg-white/30 rounded mb-2">
                    <div className="h-full bg-white rounded w-full" />
                  </div>
                  <div className="text-[10px] md:text-xs text-white/80 leading-tight">
                    курсов повышения квалификации
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
