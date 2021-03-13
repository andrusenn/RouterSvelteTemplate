<script>
    import { Router } from "./routerStore.js";
    export let name,
        cssClass,
        cssStyle,
        title,
        path,
        role = "link",
        part = "";
    function start(node) {
        $Router.start();
        return {
            destroy() {},
        };
    }
    $: if ($Router) {
        if (name) {
            path = $Router.getPath(name) + part;
        }
    }
</script>

{#if $Router}
    <a
        href={path}
        class={cssClass}
        style={cssStyle}
        {title}
        {role}
        use:start
        router
    >
        <slot />
    </a>
{/if}
