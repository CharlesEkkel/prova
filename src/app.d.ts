import type { Visitor } from './lib/shell/visitor';
import type { Supabase } from './lib/shell/supabase';

declare global {
  namespace App {
    interface Locals {
      readonly supabase: Supabase;
      readonly visitor: Visitor;
    }
  }
}

export {};
