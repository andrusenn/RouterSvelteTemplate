<script>
  import { RouterLink, RouterView, Router } from "./router/Router";
  // Get params / meta / search / hash
  $: {
    if ($Router) {
      let rs = $Router;
      console.log(rs.params, rs.meta, rs.search, rs.hash);
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
