<script>
  import RouterClass from "./RouterClass";
  import RouterLink from "./RouterLink.svelte";
  import { Router as RouterStore } from "./routerStore";
  import { onMount } from "svelte";

  // Components
  import { routes, callbacks } from "./routes";

  // Vars
  let routerClass = null;
  let component = null;
  let Router = null;
  // Mount
  onMount(() => {
    routerClass = new RouterClass(routes, {
      update: c => {
        component = c;
        Router = routerClass;
        $RouterStore = routerClass;
      },
      ...callbacks
    });
    component = routerClass.component;
    Router = routerClass;
    $RouterStore = routerClass;
  });
</script>

{#if Router}
  <svelte:component this={component} {Router} {RouterLink} />
{/if}
