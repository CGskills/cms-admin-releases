export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  position: string;
  specialization: string;
  short_description: string;
  description: string;
  experience_years: number;
  happy_patients: string;
  courses_count: number;
  certificates_count: number;
  education: string;
  qualification: string;
  achievements: string;
  photo_path: string | null;
  published: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeeFormData {
  first_name: string;
  last_name: string;
  full_name: string;
  position: string;
  specialization: string;
  short_description: string;
  description: string;
  experience_years: number;
  happy_patients: string;
  courses_count: number;
  certificates_count: number;
  education: string;
  qualification: string;
  achievements: string;
  photo_path: string | null;
  published: boolean;
  order_index?: number;
}

export interface UploadedFile {
  path: string;
  name: string;
  size: number;
  type: string;
  url: string;
}
