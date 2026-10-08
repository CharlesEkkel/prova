<script lang="ts">
  import { Avatar } from 'bits-ui';
  import { initialsOf } from '../../core/names';

  const { name, size = 'md' }: { readonly name: string; readonly size?: 'sm' | 'md' } = $props();
</script>

<Avatar.Root
  class="shrink-0 overflow-hidden rounded-full bg-primary-200 text-primary-800 {size === 'sm'
    ? 'size-9'
    : 'size-10'}"
>
  <Avatar.Fallback class="grid size-full place-items-center text-sm font-semibold">
    {initialsOf(name, size === 'sm' ? 1 : 2)}
  </Avatar.Fallback>
</Avatar.Root>
