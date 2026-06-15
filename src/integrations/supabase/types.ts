export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: []
      }
      ai_builds: {
        Row: {
          artifact_url: string | null
          created_at: string
          id: string
          logs: string | null
          platform: string
          project_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          artifact_url?: string | null
          created_at?: string
          id?: string
          logs?: string | null
          platform: string
          project_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          artifact_url?: string | null
          created_at?: string
          id?: string
          logs?: string | null
          platform?: string
          project_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_builds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ai_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_projects: {
        Row: {
          app_config: Json | null
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          preview_url: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_config?: Json | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          preview_url?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_config?: Json | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          preview_url?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          project_id: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ai_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      app_builds: {
        Row: {
          aab_storage_path: string | null
          aab_url: string | null
          apk_url: string | null
          created_at: string | null
          error_message: string | null
          github_run_id: string | null
          id: string
          logs: Json | null
          platform: string | null
          repository_id: string | null
          status: string | null
          storage_path: string | null
          updated_at: string | null
          version: string
        }
        Insert: {
          aab_storage_path?: string | null
          aab_url?: string | null
          apk_url?: string | null
          created_at?: string | null
          error_message?: string | null
          github_run_id?: string | null
          id?: string
          logs?: Json | null
          platform?: string | null
          repository_id?: string | null
          status?: string | null
          storage_path?: string | null
          updated_at?: string | null
          version: string
        }
        Update: {
          aab_storage_path?: string | null
          aab_url?: string | null
          apk_url?: string | null
          created_at?: string | null
          error_message?: string | null
          github_run_id?: string | null
          id?: string
          logs?: Json | null
          platform?: string | null
          repository_id?: string | null
          status?: string | null
          storage_path?: string | null
          updated_at?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_builds_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "github_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      app_versions: {
        Row: {
          bundle_url: string | null
          created_at: string
          download_url: string
          id: string
          notes: string | null
          platform: string
          updated_at: string
          version_name: string | null
        }
        Insert: {
          bundle_url?: string | null
          created_at?: string
          download_url: string
          id?: string
          notes?: string | null
          platform: string
          updated_at?: string
          version_name?: string | null
        }
        Update: {
          bundle_url?: string | null
          created_at?: string
          download_url?: string
          id?: string
          notes?: string | null
          platform?: string
          updated_at?: string
          version_name?: string | null
        }
        Relationships: []
      }
      cep_cache: {
        Row: {
          bairro: string | null
          cep: string
          created_at: string
          localidade: string | null
          logradouro: string | null
          uf: string | null
        }
        Insert: {
          bairro?: string | null
          cep: string
          created_at?: string
          localidade?: string | null
          logradouro?: string | null
          uf?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string
          created_at?: string
          localidade?: string | null
          logradouro?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          document: string | null
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document?: string | null
          id?: string
          name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_notes: {
        Row: {
          address_key: string
          category: string
          city: string | null
          created_at: string
          created_by: string
          delivery_id: string | null
          destination_address: string
          id: string
          neighborhood: string | null
          note: string | null
        }
        Insert: {
          address_key: string
          category: string
          city?: string | null
          created_at?: string
          created_by: string
          delivery_id?: string | null
          destination_address: string
          id?: string
          neighborhood?: string | null
          note?: string | null
        }
        Update: {
          address_key?: string
          category?: string
          city?: string | null
          created_at?: string
          created_by?: string
          delivery_id?: string | null
          destination_address?: string
          id?: string
          neighborhood?: string | null
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          at_id: string | null
          city: string | null
          confidence: Database["public"]["Enums"]["delivery_confidence"] | null
          confidence_reason: string | null
          created_at: string
          delivered_at: string | null
          destination_address: string
          driver_id: string | null
          freight_value: number | null
          id: string
          latitude: number | null
          longitude: number | null
          neighborhood: string | null
          notes: string | null
          original_sequence: number | null
          package_count: number | null
          problem_reason: string | null
          route_id: string
          sequence: number
          spx_tn: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          stop: number | null
          tracking_token: string | null
          updated_at: string
          zipcode: string | null
        }
        Insert: {
          at_id?: string | null
          city?: string | null
          confidence?: Database["public"]["Enums"]["delivery_confidence"] | null
          confidence_reason?: string | null
          created_at?: string
          delivered_at?: string | null
          destination_address: string
          driver_id?: string | null
          freight_value?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          notes?: string | null
          original_sequence?: number | null
          package_count?: number | null
          problem_reason?: string | null
          route_id: string
          sequence?: number
          spx_tn?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          stop?: number | null
          tracking_token?: string | null
          updated_at?: string
          zipcode?: string | null
        }
        Update: {
          at_id?: string | null
          city?: string | null
          confidence?: Database["public"]["Enums"]["delivery_confidence"] | null
          confidence_reason?: string | null
          created_at?: string
          delivered_at?: string | null
          destination_address?: string
          driver_id?: string | null
          freight_value?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          notes?: string | null
          original_sequence?: number | null
          package_count?: number | null
          problem_reason?: string | null
          route_id?: string
          sequence?: number
          spx_tn?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          stop?: number | null
          tracking_token?: string | null
          updated_at?: string
          zipcode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_documents: {
        Row: {
          created_at: string
          delivery_id: string
          document_type: string | null
          document_url: string
          id: string
        }
        Insert: {
          created_at?: string
          delivery_id: string
          document_type?: string | null
          document_url: string
          id?: string
        }
        Update: {
          created_at?: string
          delivery_id?: string
          document_type?: string | null
          document_url?: string
          id?: string
        }
        Relationships: []
      }
      delivery_events: {
        Row: {
          created_at: string
          delivery_id: string
          description: string | null
          event_type: string
          id: string
          latitude: number | null
          longitude: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          delivery_id: string
          description?: string | null
          event_type: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          delivery_id?: string
          description?: string | null
          event_type?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_events_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_messages: {
        Row: {
          attachment_url: string | null
          created_at: string
          delivery_id: string
          id: string
          message: string
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          delivery_id: string
          id?: string
          message: string
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          delivery_id?: string
          id?: string
          message?: string
          sender_id?: string
        }
        Relationships: []
      }
      delivery_payments: {
        Row: {
          amount: number
          created_at: string
          delivery_id: string
          id: string
          method: string | null
          pix_qr_code: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          delivery_id: string
          id?: string
          method?: string | null
          pix_qr_code?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          delivery_id?: string
          id?: string
          method?: string | null
          pix_qr_code?: string | null
          status?: string
        }
        Relationships: []
      }
      delivery_photos: {
        Row: {
          created_at: string
          delivery_id: string
          id: string
          photo_type: string | null
          photo_url: string
        }
        Insert: {
          created_at?: string
          delivery_id: string
          id?: string
          photo_type?: string | null
          photo_url: string
        }
        Update: {
          created_at?: string
          delivery_id?: string
          id?: string
          photo_type?: string | null
          photo_url?: string
        }
        Relationships: []
      }
      delivery_returns: {
        Row: {
          created_at: string
          delivery_id: string
          id: string
          photo_url: string | null
          reason: string
          status: string | null
        }
        Insert: {
          created_at?: string
          delivery_id: string
          id?: string
          photo_url?: string | null
          reason: string
          status?: string | null
        }
        Update: {
          created_at?: string
          delivery_id?: string
          id?: string
          photo_url?: string | null
          reason?: string
          status?: string | null
        }
        Relationships: []
      }
      driver_daily_scores: {
        Row: {
          created_at: string
          date: string
          driver_id: string
          final_score: number | null
          id: string
          on_time_delivery_rate: number | null
          safety_points: number | null
          success_rate: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          driver_id: string
          final_score?: number | null
          id?: string
          on_time_delivery_rate?: number | null
          safety_points?: number | null
          success_rate?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          driver_id?: string
          final_score?: number | null
          id?: string
          on_time_delivery_rate?: number | null
          safety_points?: number | null
          success_rate?: number | null
        }
        Relationships: []
      }
      driver_journey: {
        Row: {
          driver_id: string
          ended_at: string | null
          id: string
          safety_score: number | null
          started_at: string
          status: string
        }
        Insert: {
          driver_id: string
          ended_at?: string | null
          id?: string
          safety_score?: number | null
          started_at?: string
          status: string
        }
        Update: {
          driver_id?: string
          ended_at?: string | null
          id?: string
          safety_score?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      driver_stats: {
        Row: {
          deliveries_on_time: number | null
          driver_id: string
          efficiency_score: number | null
          id: string
          points: number | null
          updated_at: string
        }
        Insert: {
          deliveries_on_time?: number | null
          driver_id: string
          efficiency_score?: number | null
          id?: string
          points?: number | null
          updated_at?: string
        }
        Update: {
          deliveries_on_time?: number | null
          driver_id?: string
          efficiency_score?: number | null
          id?: string
          points?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      driver_telemetry: {
        Row: {
          accuracy: number | null
          created_at: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          speed: number | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          speed?: number | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          speed?: number | null
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      emergency_alerts: {
        Row: {
          audio_url: string | null
          created_at: string
          driver_id: string
          id: string
          location_lat: number | null
          location_long: number | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          driver_id: string
          id?: string
          location_lat?: number | null
          location_long?: number | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          location_lat?: number | null
          location_long?: number | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string
          error_message: string
          id: string
          metadata: Json | null
          route: string | null
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message: string
          id?: string
          metadata?: Json | null
          route?: string | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string
          id?: string
          metadata?: Json | null
          route?: string | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      github_repositories: {
        Row: {
          branch: string
          created_at: string | null
          id: string
          name: string
          owner: string
          repo_path: string
          token_secret_name: string | null
          updated_at: string | null
        }
        Insert: {
          branch?: string
          created_at?: string | null
          id?: string
          name: string
          owner: string
          repo_path: string
          token_secret_name?: string | null
          updated_at?: string | null
        }
        Update: {
          branch?: string
          created_at?: string | null
          id?: string
          name?: string
          owner?: string
          repo_path?: string
          token_secret_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      maintenance_records: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          id: string
          odometer_reading: number
          title: string
          user_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          odometer_reading: number
          title: string
          user_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          odometer_reading?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      offline_sync_queue: {
        Row: {
          action: string
          created_at: string | null
          delta_data: Json
          id: string
          last_error: string | null
          record_id: string
          retry_count: number | null
          table_name: string
        }
        Insert: {
          action: string
          created_at?: string | null
          delta_data: Json
          id?: string
          last_error?: string | null
          record_id: string
          retry_count?: number | null
          table_name: string
        }
        Update: {
          action?: string
          created_at?: string | null
          delta_data?: Json
          id?: string
          last_error?: string | null
          record_id?: string
          retry_count?: number | null
          table_name?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          gateway_reference: string | null
          id: string
          paid_at: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date?: string | null
          gateway_reference?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          gateway_reference?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean | null
          badges: Json | null
          company_id: string | null
          created_at: string
          efficiency_rating: number | null
          email: string | null
          expires_at: string | null
          fuel_price: number | null
          full_name: string | null
          id: string
          km_per_liter: number | null
          last_maintenance_odometer: number | null
          maintenance_alert_interval_km: number | null
          phone: string | null
          public_tracking_enabled: boolean | null
          role: string | null
          total_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          badges?: Json | null
          company_id?: string | null
          created_at?: string
          efficiency_rating?: number | null
          email?: string | null
          expires_at?: string | null
          fuel_price?: number | null
          full_name?: string | null
          id?: string
          km_per_liter?: number | null
          last_maintenance_odometer?: number | null
          maintenance_alert_interval_km?: number | null
          phone?: string | null
          public_tracking_enabled?: boolean | null
          role?: string | null
          total_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          badges?: Json | null
          company_id?: string | null
          created_at?: string
          efficiency_rating?: number | null
          email?: string | null
          expires_at?: string | null
          fuel_price?: number | null
          full_name?: string | null
          id?: string
          km_per_liter?: number | null
          last_maintenance_odometer?: number | null
          maintenance_alert_interval_km?: number | null
          phone?: string | null
          public_tracking_enabled?: boolean | null
          role?: string | null
          total_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_of_delivery: {
        Row: {
          created_at: string
          delivery_id: string
          document: string | null
          id: string
          notes: string | null
          photo_url: string | null
          receiver_name: string | null
          scanned_barcode: string | null
          signature_url: string | null
        }
        Insert: {
          created_at?: string
          delivery_id: string
          document?: string | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          receiver_name?: string | null
          scanned_barcode?: string | null
          signature_url?: string | null
        }
        Update: {
          created_at?: string
          delivery_id?: string
          document?: string | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          receiver_name?: string | null
          scanned_barcode?: string | null
          signature_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proof_of_delivery_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_text: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_text: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_text?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      route_checklists: {
        Row: {
          completed_at: string
          driver_id: string
          id: string
          items: Json
          route_id: string
        }
        Insert: {
          completed_at?: string
          driver_id: string
          id?: string
          items: Json
          route_id: string
        }
        Update: {
          completed_at?: string
          driver_id?: string
          id?: string
          items?: Json
          route_id?: string
        }
        Relationships: []
      }
      route_deletion_logs: {
        Row: {
          company_id: string | null
          deleted_at: string
          error_details: Json | null
          id: string
          metadata: Json | null
          reason: string | null
          route_id: string
          route_name: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          deleted_at?: string
          error_details?: Json | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          route_id: string
          route_name?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          deleted_at?: string
          error_details?: Json | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          route_id?: string
          route_name?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      route_import_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          file_name: string
          id: string
          status: string
          total_deliveries: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          file_name: string
          id?: string
          status: string
          total_deliveries: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          file_name?: string
          id?: string
          status?: string
          total_deliveries?: number
          user_id?: string
        }
        Relationships: []
      }
      route_jobs: {
        Row: {
          attempts: number
          company_id: string
          created_at: string
          deliveries: Json
          driver_id: string
          error_message: string | null
          finished_at: string | null
          freight_value: number
          id: string
          name: string
          progress: number
          route_id: string | null
          source_file_name: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["route_job_status"]
          total_deliveries: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          company_id: string
          created_at?: string
          deliveries: Json
          driver_id: string
          error_message?: string | null
          finished_at?: string | null
          freight_value?: number
          id?: string
          name: string
          progress?: number
          route_id?: string | null
          source_file_name?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["route_job_status"]
          total_deliveries?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          company_id?: string
          created_at?: string
          deliveries?: Json
          driver_id?: string
          error_message?: string | null
          finished_at?: string | null
          freight_value?: number
          id?: string
          name?: string
          progress?: number
          route_id?: string | null
          source_file_name?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["route_job_status"]
          total_deliveries?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      route_safety_scores: {
        Row: {
          created_at: string | null
          distance_km: number | null
          driver_id: string
          harsh_braking_count: number | null
          id: string
          route_id: string
          score: number
          sharp_turn_count: number | null
          speeding_count: number | null
        }
        Insert: {
          created_at?: string | null
          distance_km?: number | null
          driver_id: string
          harsh_braking_count?: number | null
          id?: string
          route_id: string
          score?: number
          sharp_turn_count?: number | null
          speeding_count?: number | null
        }
        Update: {
          created_at?: string | null
          distance_km?: number | null
          driver_id?: string
          harsh_braking_count?: number | null
          id?: string
          route_id?: string
          score?: number
          sharp_turn_count?: number | null
          speeding_count?: number | null
        }
        Relationships: []
      }
      route_uploads: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          invalid_rows: number | null
          original_file_name: string | null
          route_id: string
          total_rows: number | null
          user_id: string | null
          valid_rows: number | null
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          invalid_rows?: number | null
          original_file_name?: string | null
          route_id: string
          total_rows?: number | null
          user_id?: string | null
          valid_rows?: number | null
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          invalid_rows?: number | null
          original_file_name?: string | null
          route_id?: string
          total_rows?: number | null
          user_id?: string | null
          valid_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "route_uploads_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          actual_fuel_cost: number | null
          company_id: string
          created_at: string
          deleted_at: string | null
          driver_id: string | null
          estimated_duration: number | null
          estimated_fuel_cost: number | null
          finished_at: string | null
          freight_value: number | null
          fuel_price_at_time: number | null
          id: string
          name: string
          optimization_mode: Database["public"]["Enums"]["optimization_mode"]
          route_date: string
          source_file_name: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["route_status"]
          tolls_value: number
          total_deliveries: number
          total_distance: number | null
          updated_at: string
          user_id: string
          vehicle_consumption_kml: number | null
        }
        Insert: {
          actual_fuel_cost?: number | null
          company_id: string
          created_at?: string
          deleted_at?: string | null
          driver_id?: string | null
          estimated_duration?: number | null
          estimated_fuel_cost?: number | null
          finished_at?: string | null
          freight_value?: number | null
          fuel_price_at_time?: number | null
          id?: string
          name: string
          optimization_mode?: Database["public"]["Enums"]["optimization_mode"]
          route_date?: string
          source_file_name?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["route_status"]
          tolls_value?: number
          total_deliveries?: number
          total_distance?: number | null
          updated_at?: string
          user_id: string
          vehicle_consumption_kml?: number | null
        }
        Update: {
          actual_fuel_cost?: number | null
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          driver_id?: string | null
          estimated_duration?: number | null
          estimated_fuel_cost?: number | null
          finished_at?: string | null
          freight_value?: number | null
          fuel_price_at_time?: number | null
          id?: string
          name?: string
          optimization_mode?: Database["public"]["Enums"]["optimization_mode"]
          route_date?: string
          source_file_name?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["route_status"]
          tolls_value?: number
          total_deliveries?: number
          total_distance?: number | null
          updated_at?: string
          user_id?: string
          vehicle_consumption_kml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "routes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          company_id: string
          created_at: string
          id: string
          next_due_date: string | null
          payment_gateway: string | null
          payment_method: string | null
          plan_name: string
          price: number
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          next_due_date?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          plan_name?: string
          price?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          next_due_date?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          plan_name?: string
          price?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      sync_queue: {
        Row: {
          action_type: string
          created_at: string
          id: string
          last_error: string | null
          payload: Json
          processed_at: string | null
          retry_count: number
          status: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          last_error?: string | null
          payload: Json
          processed_at?: string | null
          retry_count?: number
          status?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          retry_count?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_settings: {
        Row: {
          bot_token: string
          chat_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          bot_token: string
          chat_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          bot_token?: string
          chat_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      telemetry_points: {
        Row: {
          driver_id: string | null
          id: string
          latitude: number
          longitude: number
          recorded_at: string
          route_id: string
          speed: number | null
        }
        Insert: {
          driver_id?: string | null
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string
          route_id: string
          speed?: number | null
        }
        Update: {
          driver_id?: string | null
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
          route_id?: string
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_points_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      training_videos: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          required: boolean | null
          title: string
          video_url: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          required?: boolean | null
          title: string
          video_url: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          required?: boolean | null
          title?: string
          video_url?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_maintenance: {
        Row: {
          alerts: string | null
          created_at: string
          driver_id: string
          fuel_level: number | null
          id: string
          odometer: number
        }
        Insert: {
          alerts?: string | null
          created_at?: string
          driver_id: string
          fuel_level?: number | null
          id?: string
          odometer: number
        }
        Update: {
          alerts?: string | null
          created_at?: string
          driver_id?: string
          fuel_level?: number | null
          id?: string
          odometer?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_route_with_deliveries: {
        Args: {
          p_company_id: string
          p_deliveries: Json
          p_driver_id: string
          p_freight_value: number
          p_invalid_rows?: number
          p_name: string
          p_route_date?: string
          p_source_file_name: string
          p_total_deliveries: number
          p_total_rows?: number
          p_user_id: string
        }
        Returns: {
          actual_fuel_cost: number | null
          company_id: string
          created_at: string
          deleted_at: string | null
          driver_id: string | null
          estimated_duration: number | null
          estimated_fuel_cost: number | null
          finished_at: string | null
          freight_value: number | null
          fuel_price_at_time: number | null
          id: string
          name: string
          optimization_mode: Database["public"]["Enums"]["optimization_mode"]
          route_date: string
          source_file_name: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["route_status"]
          tolls_value: number
          total_deliveries: number
          total_distance: number | null
          updated_at: string
          user_id: string
          vehicle_consumption_kml: number | null
        }
        SetofOptions: {
          from: "*"
          to: "routes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_dashboard_stats: {
        Args: {
          p_date_from: string
          p_date_to: string
          p_driver_id?: string
          p_force_self?: boolean
        }
        Returns: Json
      }
      get_user_company:
        | { Args: never; Returns: string }
        | { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_route_with_deliveries: {
        Args: {
          p_company_id: string
          p_deliveries: Json
          p_driver_id: string
          p_freight_value: number
          p_invalid_rows: number
          p_name: string
          p_source_file_name: string
          p_total_deliveries: number
          p_total_rows: number
          p_user_id: string
        }
        Returns: Json
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recover_stuck_route_jobs: { Args: never; Returns: undefined }
      soft_delete_route: {
        Args: { p_reason?: string; p_route_id: string }
        Returns: undefined
      }
      update_deliveries_original_sequence: {
        Args: { delivery_ids: string[]; sequences: number[] }
        Returns: undefined
      }
      update_deliveries_sequence: {
        Args: { delivery_ids: string[]; sequences: number[] }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "subscriber" | "driver"
      delivery_confidence: "high" | "medium" | "low"
      delivery_status:
        | "pending"
        | "in_route"
        | "delivered"
        | "problem"
        | "rescheduled"
        | "returned"
        | "cancelled"
      optimization_mode: "original" | "shortest_distance" | "fastest_time"
      payment_status: "paid" | "pending" | "failed" | "refunded"
      route_job_status: "pending" | "processing" | "done" | "error"
      route_status:
        | "draft"
        | "planned"
        | "in_progress"
        | "completed"
        | "cancelled"
      subscription_status: "active" | "overdue" | "cancelled" | "pending"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "subscriber", "driver"],
      delivery_confidence: ["high", "medium", "low"],
      delivery_status: [
        "pending",
        "in_route",
        "delivered",
        "problem",
        "rescheduled",
        "returned",
        "cancelled",
      ],
      optimization_mode: ["original", "shortest_distance", "fastest_time"],
      payment_status: ["paid", "pending", "failed", "refunded"],
      route_job_status: ["pending", "processing", "done", "error"],
      route_status: [
        "draft",
        "planned",
        "in_progress",
        "completed",
        "cancelled",
      ],
      subscription_status: ["active", "overdue", "cancelled", "pending"],
    },
  },
} as const
