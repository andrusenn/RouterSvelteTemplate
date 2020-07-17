# Routing components for Svelte

This is a personal solution for routing in svelte.

## Usage

```text
src/
   router/
       Router.js
       RouterClass.js
       RouterLink.svelte
       routerStore.js
       RouterView.svelte
       routes.js
    views/
       About.svelte
       Home.svelte
  App.svelte
```

### routes.js

Config routes (Array[objects]).

|     name | value                                                                                                         |
| -------: | ------------------------------------------------------------------------------------------------------------- |
|   `path` | _[required]_ is the path show in address bar                                                                  |
|   `name` | _[required]_ name of the route                                                                                |
|     `do` | function callback `do:function(data){}`                                                                       |
| `params` | Dynamic parameters. Capture each part of defined parameter. `params:{param1:'',param2:''}` param1/param2/etc` |
|   `meta` | function callback `do:function(data){}`                                                                       |
|  `title` | page title `<title></title>`                                                                                  |

```js
// routes.js

// Components
import Home from "../views/Home.svelte";
import About from "../views/About.svelte";
import NotFound from "../views/NotFound.svelte";

// Vars
let routes = [
    // Paths
    {
        path: "/",
        name: "home",
        component: Home,
        title: "Home",
    },
    {
        path: "/about",
        name: "about",
        // dynamic parameters
        // if it's defined, return valid route -> /about/param1
        params:{
          param1:'',
           // if a second param is defined, return valid route -> /about/param1/param2
          param2:'',
        }
        component: About,
        title: "About",
    },
    {
        path: "*",
        component: NotFound,
        title: "404",
    },
];
let callbacks = {
    init: () => {
        //
    },
    // middleware
    before: (next) => {
        //let to = setTimeout(() => {
            next();
            //clearTimeout(to);
        //}, 500);
    },
    after: (next) => {
        //
    },
};
export { routes, callbacks };
```

### App.svelte

```html
<script>
    import { RouterLink, RouterView, RouterStore } from "./router/Router";
</script>

<main>
    <nav>
        <RouterLink name="home">Home</RouterLink>
        <RouterLink name="about">About</RouterLink>
    </nav>
    <hr />
    <RouterView />
</main>
```

### Routing the components

Routed components can fetch `RouterLink` and `Router`.

Example:

#### Home.svelte

```html
<script>
    export let RouterLink, Router;
</script>

<div>
    <RouterLink name="about" part="?x=0#myhash">About</RouterLink>
</div>
```
