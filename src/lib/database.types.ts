export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string | null;
          phone: string | null;
          email: string | null;
          school: string | null;
          passing_year: string | null;
          category: string | null;
          preferred_district: string | null;
          preferred_branches: string[] | null;
          budget: number | null;
          language: string | null;
          profile_complete: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      student_academic_records: {
        Row: {
          id: string;
          user_id: string;
          maths: number | null;
          physics: number | null;
          chemistry: number | null;
          cutoff: number | null;
          category: string | null;
          source: string | null;
          academic_year: string | null;
          confirmed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["student_academic_records"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["student_academic_records"]["Insert"]>;
      };
      saved_colleges: {
        Row: {
          id: string;
          user_id: string;
          college_code: string;
          college_name: string;
          branch_code: string;
          branch_name: string;
          district: string | null;
          college_type: string | null;
          cutoff_2023: number | null;
          fees: number | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["saved_colleges"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["saved_colleges"]["Insert"]>;
      };
      counselling_sessions: {
        Row: {
          id: string;
          user_id: string;
          role: "user" | "assistant";
          content: string;
          sources: Json | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["counselling_sessions"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["counselling_sessions"]["Insert"]>;
      };
      counselling_reports: {
        Row: {
          id: string;
          user_id: string;
          report_data: Json;
          generated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["counselling_reports"]["Row"], "id" | "generated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["counselling_reports"]["Insert"]>;
      };
    };
  };
}
