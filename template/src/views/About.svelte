<script>
    export let RouterLink, Router;
    let param;
    $: {
        if (Router) {
            param = Router.params.param1;
        }
    }
</script>

<style>
    .get-param {
        background: #333;
        color: #fff;
        padding: 15px;
        margin: 10px 0;
    }
</style>

<h1>About</h1>
<hr />
{#if param}
    <div class="get-param">My param is: '{param}'</div>
{/if}

<h4>With name & part props</h4>
<p>
    Use
    <code>name</code>
    prop and pass props & query parts in
    <code>part</code>
    prop
</p>
<code>
    {`<RouterLink name="home" part="hello/world">
        go home with path params
    </RouterLink>`}
</code>
<p>
    <RouterLink name="home" part="hello/world">
        go home with path params
    </RouterLink>
</p>

<h4>With path prop</h4>
<p>
    Pass all in
    <code>path</code>
    prop.
</p>
<code>
    {`<RouterLink path="/hello/world">go home with path params</RouterLink>`}
</code>
<p>
    <RouterLink path="/hello/world">go home with path params</RouterLink>
</p>
