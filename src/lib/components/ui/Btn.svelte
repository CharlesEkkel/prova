<script lang="ts">
  import { Button } from 'bits-ui';
  import type { ComponentProps } from 'svelte';

  type Variant = 'solid' | 'soft' | 'ghost' | 'outline' | 'danger';
  type Size = 'sm' | 'md' | 'icon';

  const {
    variant = 'solid',
    size = 'md',
    class: extra = '',
    children,
    ...rest
  }: ComponentProps<typeof Button.Root> & { variant?: Variant; size?: Size } = $props();

  const variants: Readonly<Record<Variant, string>> = {
    solid: 'bg-primary-600 text-white hover:bg-primary-500',
    soft: 'bg-primary-100 text-primary-700 hover:bg-primary-200 dark:bg-primary-500/15 dark:text-primary-300 dark:hover:bg-primary-500/25',
    ghost: 'hover:bg-zinc-200/70 dark:hover:bg-zinc-800',
    outline: 'border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800',
    danger: 'bg-red-600 text-white hover:bg-red-500',
  };
  const sizes: Readonly<Record<Size, string>> = {
    sm: 'h-11 px-4 text-sm',
    md: 'h-11 px-5',
    icon: 'size-11',
  };
</script>

<Button.Root
  class="inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium transition active:scale-95 disabled:pointer-events-none disabled:opacity-40 {variants[
    variant
  ]} {sizes[size]} {extra}"
  {...rest}
>
  {@render children?.()}
</Button.Root>
