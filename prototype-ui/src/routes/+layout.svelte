<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { dev } from '$app/environment';
  let { children } = $props();
  const screens = [
    { href: '/', label: 'Home', match: (p: string) => p === '/' },
    { href: '/piece/p1', label: 'Piece', match: (p: string) => p.startsWith('/piece') },
    { href: '/perform/w1', label: 'Play-through', match: (p: string) => p.startsWith('/perform') }
  ];
</script>

<div class="phone">
  {#if dev}
    <nav class="proto-nav" aria-label="Prototype screens">
      <span>PROTOTYPE</span>
      {#each screens as s}
        <a href={s.href} class:on={s.match(page.url.pathname)}>{s.label}</a>
      {/each}
    </nav>
  {/if}
  {@render children()}
</div>

<style>
  .proto-nav { display: flex; gap: 6px; align-items: center; background: #111; color: #fff; padding: 6px 10px; font-size: 12px; flex: none; }
  .proto-nav span { font-weight: 800; letter-spacing: .1em; color: #ffcc00; margin-right: auto; }
  .proto-nav a { padding: 4px 10px; border-radius: 99px; opacity: .65; }
  .proto-nav a.on { background: #fff; color: #111; opacity: 1; font-weight: 700; }
</style>
