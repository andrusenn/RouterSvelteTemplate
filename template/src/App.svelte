<script>
    import * as routes from "./routes";
    // import { RouterLink, RouterView, Router } from "svelte-routed";
    import { RouterLink, RouterView, Router } from "./router/index.js";
    // Get params / meta / search / hash
    $: {
        if ($Router) {
            let rs = $Router;
            console.log(rs.params, rs.meta, rs.search, rs.hash);
        }
    }
</script>

<style>
    :global(code) {
        background: #eee;
        padding: 4px 3px;
        font-family: "Courier New", Courier, monospace;
    }
</style>

<main>
    <nav>
        <RouterLink name="home">Home</RouterLink>
        |
        <RouterLink name="about">About</RouterLink>
        |
        <RouterLink path="/about/hello-param">About with param</RouterLink>
    </nav>
    <hr />
    <RouterView use={routes} />
</main>
