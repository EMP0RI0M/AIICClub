export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          display_name: string;
          role: string;
          auth_user_id: string | null;
          avatar_url: string | null;
          bio: string | null;
          class_year: string | null;
          section: string | null;
          status: string;
          github_url: string | null;
          website_url: string | null;
          linkedin_url: string | null;
          is_leadership: boolean;
          leadership_title: string | null;
          leadership_order: number;
          interests: string[];
          skills: string[];
          onboarding_completed: boolean;
          email_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["users"]["Row"]> & {
          email: string;
          username: string;
          display_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
      };
      projects: {
        Row: {
          id: string;
          project_number: string | null;
          slug: string;
          title: string;
          summary: string | null;
          description: string;
          status: string;
          category: string;
          cover_image: string | null;
          gallery: string[];
          technologies: string[];
          repository_url: string | null;
          demo_url: string | null;
          documentation_url: string | null;
          team: string[];
          featured: boolean;
          start_date: string | null;
          end_date: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["projects"]["Row"]> & {
          slug: string;
          title: string;
          description: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Row"]>;
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          project_id: string;
          user_id: string;
          role?: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_members"]["Row"]>;
      };
      events: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string;
          event_type: string;
          status: string;
          start_at: string;
          end_at: string | null;
          location: string;
          cover_image: string | null;
          capacity: number | null;
          organizer: string;
          registration_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["events"]["Row"]> & {
          title: string;
          slug: string;
          description: string;
          start_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Row"]>;
      };
      event_participants: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          status: string;
          registered_at: string;
          attended_at: string | null;
        };
        Insert: {
          event_id: string;
          user_id: string;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_participants"]["Row"]>;
      };
      achievements: {
        Row: {
          id: string;
          title: string;
          description: string;
          recipient: string;
          recipient_id: string | null;
          category: string;
          date: string;
          organization: string;
          rank_result: string | null;
          proof_link: string | null;
          image: string | null;
          featured: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["achievements"]["Row"]> & {
          title: string;
          description: string;
          recipient: string;
        };
        Update: Partial<Database["public"]["Tables"]["achievements"]["Row"]>;
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          slug: string;
          content: string;
          author: string;
          author_id: string | null;
          category: string;
          priority: string;
          is_pinned: boolean;
          featured: boolean;
          cover_image: string | null;
          published_at: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["announcements"]["Row"]> & {
          title: string;
          slug: string;
          content: string;
        };
        Update: Partial<Database["public"]["Tables"]["announcements"]["Row"]>;
      };
      archive_records: {
        Row: {
          id: string;
          archive_id: string;
          title: string;
          slug: string | null;
          description: string;
          type: string;
          session: string;
          year: number;
          status: string;
          visibility: string;
          tags: string[];
          history_notes: string | null;
          featured: boolean;
          project_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["archive_records"]["Row"]> & {
          archive_id: string;
          title: string;
          description: string;
          type: string;
        };
        Update: Partial<Database["public"]["Tables"]["archive_records"]["Row"]>;
      };
      repositories: {
        Row: {
          id: string;
          archive_id: string | null;
          project_id: string | null;
          github_repository_id: number | null;
          github_owner: string;
          github_name: string;
          github_url: string;
          description: string | null;
          default_branch: string;
          language: string | null;
          topics: string[];
          stars_count: number;
          forks_count: number;
          open_issues_count: number;
          sync_status: string;
          last_synced_at: string;
          sync_error: string | null;
          cached_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["repositories"]["Row"]> & {
          github_owner: string;
          github_name: string;
          github_url: string;
        };
        Update: Partial<Database["public"]["Tables"]["repositories"]["Row"]>;
      };
      documents: {
        Row: {
          id: string;
          archive_id: string | null;
          title: string;
          description: string | null;
          category: string;
          author: string;
          current_version: string;
          file_path: string;
          file_name: string;
          mime_type: string;
          file_size: number;
          storage_bucket: string;
          file_url: string;
          sha256: string | null;
          versions: Json;
          download_count: number;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["documents"]["Row"]> & {
          title: string;
          file_path: string;
          file_name: string;
          file_url: string;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Row"]>;
      };
    };
  };
}
