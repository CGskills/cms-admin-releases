export interface Testimonial {
  id: string;
  name: string;
  surname?: string;
  position?: string;
  company?: string;
  location?: string;
  content: string;
  rating: number;
  avatar_path?: string;
  screenshot_path?: string;
  source_url?: string;
  published: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface TestimonialMedia {
  id: string;
  testimonial_id: string;
  file_path: string;
  file_type: 'avatar' | 'screenshot' | 'gallery';
  alt?: string;
  order_index: number;
  created_at: string;
}

export interface TestimonialWithMedia extends Testimonial {
  media?: TestimonialMedia[];
}

export interface TestimonialFormData {
  name: string;
  surname?: string;
  position?: string;
  company?: string;
  location?: string;
  content: string;
  rating: number;
  avatar_path?: string;
  screenshot_path?: string;
  source_url?: string;
  published: boolean;
  order_index?: number;
}

export type MediaType = 'avatar' | 'screenshot' | 'gallery';

export interface UploadedFile {
  path: string;
  name: string;
  size: number;
  type: string;
  url: string;
}
