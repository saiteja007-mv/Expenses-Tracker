-- Migration to make category_id optional in transactions table
ALTER TABLE public.transactions ALTER COLUMN category_id DROP NOT NULL;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL; 