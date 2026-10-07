import type { Session } from './lib/shell/session';
import type { Supabase } from './lib/shell/supabase';

declare global {
  namespace App {
    interface Locals {
      readonly supabase: Supabase;
      readonly session: Session;
    }
  }
}

export {};
