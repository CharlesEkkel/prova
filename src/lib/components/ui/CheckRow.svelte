<script lang="ts">
  // A Bits UI checkbox with its label, submitted by name and value with the surrounding form.
  import { Checkbox, Label } from 'bits-ui';
  import { Check } from '@lucide/svelte';

  const {
    id,
    name,
    value,
    checked,
    disabled = false,
    onChange,
    title,
    detail,
  }: {
    readonly id: string;
    readonly name: string;
    readonly value: string;
    readonly checked: boolean;
    readonly disabled?: boolean;
    readonly onChange?: (checked: boolean) => void;
    readonly title: string;
    readonly detail: string;
  } = $props();
</script>

<div class="flex items-start gap-3 rounded-xl px-2 py-2 {disabled ? 'opacity-60' : ''}">
  <Checkbox.Root
    {id}
    {name}
    {value}
    {checked}
    {disabled}
    onCheckedChange={(next: boolean) => {
      onChange?.(next);
    }}
    class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border border-zinc-400 data-[state=checked]:border-primary-600 data-[state=checked]:bg-primary-600 dark:border-zinc-600"
  >
    {#snippet children({ checked: isChecked })}
      {#if isChecked}<Check class="size-4 text-white" />{/if}
    {/snippet}
  </Checkbox.Root>
  <Label.Root for={id} class="min-h-6 text-sm">
    <b class="block">{title}</b>
    <span class="text-zinc-500">{detail}</span>
  </Label.Root>
</div>
