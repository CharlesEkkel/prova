<script lang="ts">
  const {
    label,
    tone = 'primary',
    disabled = false,
    onCancel,
  }: {
    readonly label: string;
    readonly tone?: 'primary' | 'danger';
    readonly disabled?: boolean;
    readonly onCancel: () => void;
  } = $props();
</script>

<button
  {disabled}
  class="min-h-11 rounded px-4 font-medium text-white disabled:opacity-60 {tone === 'danger'
    ? 'bg-red-700'
    : 'bg-primary-600'}">{label}</button
>
<button type="button" class="min-h-11 rounded border px-4" onclick={onCancel}>Cancel</button>
