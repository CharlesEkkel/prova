<script lang="ts">
  import type { PageData } from './$types';

  const { data }: { readonly data: PageData } = $props();
</script>

<div class="mx-auto flex max-w-3xl flex-col gap-4 p-6">
  <h1 class="text-2xl font-semibold">Welcome, {data.singerName}</h1>
</div>
