<script>
  import RouterClass from "./RouterClass";
  import RouterLink from "./RouterLink.svelte";
  import { Router as RouterStore } from "./routerStore";
  import { onMount } from "svelte";

  export let use = { routes: [], fns: {} };

  let routerClass = null;
  let component = null;
  let Router = null;

  onMount(() => {
    routerClass = new RouterClass(use.routes, {
      update: c => {
        component = c;
        Router = routerClass;
        $RouterStore = routerClass;
      },
      ...use.fns
    });
    component = routerClass.component;
    Router = routerClass;
    $RouterStore = routerClass;
  });
</script>

{#if Router}
  <svelte:component this={component} {Router} {RouterLink} />
{/if}
