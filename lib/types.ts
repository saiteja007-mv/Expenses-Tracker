export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: 'income' | 'expense';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: 'income' | 'expense';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: 'income' | 'expense';
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          type: 'income' | 'expense';
          amount: number;
          currency: string;
          date: string;
          merchant: string | null;
          notes: string | null;
          attachment_url: string | null;
          sheet_row_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          type: 'income' | 'expense';
          amount: number;
          currency?: string;
          date: string;
          merchant?: string | null;
          notes?: string | null;
          attachment_url?: string | null;
          sheet_row_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string | null;
          type?: 'income' | 'expense';
          amount?: number;
          currency?: string;
          date?: string;
          merchant?: string | null;
          notes?: string | null;
          attachment_url?: string | null;
          sheet_row_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
} 