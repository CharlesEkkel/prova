<script lang="ts">
  // A Bits UI switch with its label: an on or off setting that takes effect the moment it flips.
  import { Label, Switch } from 'bits-ui';

  const {
    id,
    checked,
    onChange,
    title,
  }: {
    readonly id: string;
    readonly checked: boolean;
    readonly onChange: (checked: boolean) => void;
    readonly title: string;
  } = $props();
</script>

<div class="flex min-h-11 items-center justify-between gap-3">
  <Label.Root for={id} class="text-sm">{title}</Label.Root>
  <Switch.Root
    {id}
    {checked}
    onCheckedChange={onChange}
    class="inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full bg-zinc-300 px-0.5 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 data-[state=checked]:bg-primary-600 dark:bg-zinc-700"
  >
    <Switch.Thumb
      class="size-6 rounded-full bg-white shadow transition data-[state=checked]:translate-x-5"
    />
  </Switch.Root>
</div>
