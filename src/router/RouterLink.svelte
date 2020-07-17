<script>
  import { RouterStore } from "./routerStore";
  import { onMount } from "svelte";
  export let name;
  export let part = "";
  $: {
    if ($RouterStore) {
      $RouterStore.start();
    }
  }
</script>

{#if $RouterStore}
  <a href={$RouterStore.getPath(name) + part} router>
    <slot />
  </a>
{/if}
