import type { ColourTheme } from './lib/core/colour-theme';
import type { Visitor } from './lib/shell/visitor';
import type { Supabase } from './lib/shell/supabase';

declare global {
  namespace App {
    interface Locals {
      readonly supabase: Supabase;
      readonly visitor: Visitor;
      /** The site Colour Theme this request is shown in. */
      readonly colourTheme: ColourTheme;
    }
  }
}

export {};
