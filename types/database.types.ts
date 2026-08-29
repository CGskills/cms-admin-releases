export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      pages: {
        Row: {
          id: string
          title: string
          slug: string
          content: string
          seo_title: string | null
          seo_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          content: string
          seo_title?: string | null
          seo_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          content?: string
          seo_title?: string | null
          seo_description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      portfolio_items: {
        Row: {
          id: string
          title: string
          slug: string
          subtitle: string
          description: string
          problem: string
          solution: string
          result: string
          category: string | null
          technologies: string[]
          client: string | null
          project_date: string | null
          project_url: string | null
          image_url: string
          before_image: string | null
          after_image: string | null
          gallery: string[]
          col_span: number
          tile_height: number
          cover_x: number
          cover_y: number
          cover_zoom: number
          order_index: number
          visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          subtitle?: string
          description?: string
          problem?: string
          solution?: string
          result?: string
          category?: string | null
          technologies?: string[]
          client?: string | null
          project_date?: string | null
          project_url?: string | null
          image_url?: string
          before_image?: string | null
          after_image?: string | null
          gallery?: string[]
          col_span?: number
          tile_height?: number
          cover_x?: number
          cover_y?: number
          cover_zoom?: number
          order_index?: number
          visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          subtitle?: string
          description?: string
          problem?: string
          solution?: string
          result?: string
          category?: string | null
          technologies?: string[]
          client?: string | null
          project_date?: string | null
          project_url?: string | null
          image_url?: string
          before_image?: string | null
          after_image?: string | null
          gallery?: string[]
          col_span?: number
          tile_height?: number
          cover_x?: number
          cover_y?: number
          cover_zoom?: number
          order_index?: number
          visible?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          title: string
          description: string
          icon: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          icon?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          icon?: string | null
          created_at?: string
        }
      }
      pricing: {
        Row: {
          id: string
          category: string
          name: string
          description: string
          price: string
          order_index: number
          visible: boolean
          duration: string
          features: string[]
          created_at: string
        }
        Insert: {
          id?: string
          category: string
          name: string
          description: string
          price: string
          order_index?: number
          visible?: boolean
          duration?: string
          features?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          category?: string
          name?: string
          description?: string
          price?: string
          order_index?: number
          visible?: boolean
          duration?: string
          features?: string[]
          created_at?: string
        }
      }
      testimonials: {
        Row: {
          id: string
          name: string
          position: string
          avatar: string | null
          text: string
          rating: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          position: string
          avatar?: string | null
          text: string
          rating: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          position?: string
          avatar?: string | null
          text?: string
          rating?: number
          created_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          name: string
          position: string
          photo: string | null
          description: string
          social_links: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          position: string
          photo?: string | null
          description: string
          social_links?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          position?: string
          photo?: string | null
          description?: string
          social_links?: Json | null
          created_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          site_name: string
          logo: string | null
          email: string | null
          phone: string | null
          social_links: Json | null
          pricing_settings: Json | null
          updated_at: string
        }
        Insert: {
          id?: string
          site_name: string
          logo?: string | null
          email?: string | null
          phone?: string | null
          social_links?: Json | null
          pricing_settings?: Json | null
          updated_at?: string
        }
        Update: {
          id?: string
          site_name?: string
          logo?: string | null
          email?: string | null
          phone?: string | null
          social_links?: Json | null
          pricing_settings?: Json | null
          updated_at?: string
        }
      }
    }
  }
}
