<script>
    export let Router;
    $: console.log(Router.params);
</script>

<h1>Home</h1>
<hr />
{#if Router.params.param1}
    <p>{Router.params.param1 + ' ' + Router.params.param2}</p>
{/if}
