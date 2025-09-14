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
      products: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          description: string | null;
          price: number;
          stock: number;
          barcode: string | null;
          category: string | null;
          image_url: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          name: string;
          description?: string | null;
          price: number;
          stock: number;
          barcode?: string | null;
          category?: string | null;
          image_url?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          name?: string;
          description?: string | null;
          price?: number;
          stock?: number;
          barcode?: string | null;
          category?: string | null;
          image_url?: string | null;
        };
      };
      transactions: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string | null;
          customer_name: string;
          total_amount: number;
          payment_method: string | null;
          payment_status: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string | null;
          customer_name: string;
          total_amount: number;
          payment_method?: string | null;
          payment_status?: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string | null;
          customer_name?: string;
          total_amount?: number;
          payment_method?: string | null;
          payment_status?: string;
          notes?: string | null;
        };
      };
      transaction_items: {
        Row: {
          id: string;
          created_at: string;
          transaction_id: string;
          product_id: string;
          quantity: number;
          price: number;
          subtotal: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          transaction_id: string;
          product_id: string;
          quantity: number;
          price: number;
          subtotal: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          transaction_id?: string;
          product_id?: string;
          quantity?: number;
          price?: number;
          subtotal?: number;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      decrement_stock: {
        Args: {
          product_id: string;
          amount: number;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
