<script>
  import { RouterLink, RouterView, RouterStore } from "./router/Router";
  $: {
    if ($RouterStore) {
      console.log($RouterStore.params);
    }
  }
</script>

<main>
  <nav>
    <RouterLink name="home">Home</RouterLink>
    <RouterLink name="about">About</RouterLink>
  </nav>
  <hr />
  <RouterView />
</main>
