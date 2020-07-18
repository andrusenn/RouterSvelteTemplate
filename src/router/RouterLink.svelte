<script>
  import { Router } from "./routerStore";
  export let name,
    part = "";
  function start(node) {
    $Router.start();
    return {
      destroy() {}
    };
  }
</script>

{#if $Router}
  <a href={$Router.getPath(name) + part} use:start router>
    <slot />
  </a>
{/if}
