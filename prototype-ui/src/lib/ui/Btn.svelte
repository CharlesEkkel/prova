<script lang="ts">
  import { Button } from 'bits-ui';
  let { variant = 'solid', size = 'md', class: cls = '', children, ...rest } = $props();
  const v: Record<string, string> = {
    solid: 'bg-violet-600 text-white hover:bg-violet-500',
    soft: 'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:hover:bg-violet-500/25',
    ghost: 'hover:bg-zinc-200/70 dark:hover:bg-zinc-800',
    outline: 'border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800'
  };
  const s: Record<string, string> = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-11 px-5',
    icon: 'size-11',
    iconLg: 'size-16'
  };
</script>

<Button.Root
  class="inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium transition active:scale-95 disabled:pointer-events-none disabled:opacity-40 {v[variant]} {s[size]} {cls}"
  {...rest}
>
  {@render children?.()}
</Button.Root>
