<script>
  import { Router } from "./routerStore.js";
  export let name,
    cssClass,
    cssStyle,
    title,
    role = "link",
    part = "";
  function start(node) {
    $Router.start();
    return {
      destroy() {}
    };
  }
</script>

{#if $Router}
  <a
    href={$Router.getPath(name) + part}
    class={cssClass}
    style={cssStyle}
    {title}
    {role}
    use:start
    router>
    <slot />
  </a>
{/if}
