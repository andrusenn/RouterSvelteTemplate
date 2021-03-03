# Svelte Routed

This is a personal solution for routing in svelte used in my projects.

## Demo template

Clone demo template:

1. `npx degit andrusenn/RouterSvelteTemplate/template template`
2. `cd template`
3. `npm install`
4. `npm run dev` or `npm run start`

### routes.js

Create a file to config Router and all routes.

```js
// routes.js

// Import the components
import Home from "./views/Home.svelte";
import About from "./views/About.svelte";
import NotFound from "./views/NotFound.svelte";

// Vars
let routes = {
    paths: [
        // Paths
        {
            path: "/", // required
            name: "home", // required
            component: Home, // required
            title: "Home",
        },
        {
            path: "/about", // required
            name: "about", // required
            do: function (data) {
                // Do something
                console.log(data);
            },
            // Support dynamic parameters
            // if it's defined, return valid route -> /about/param1
            params: {
                param1: "",
                // if a second param is defined, return valid route -> /about/param1/param2
                param2: "",
            },
            // Add some meta data
            meta: {
                someparam: "foo",
            },
            component: About, // required
            title: "About",
        },
        {
            // Fallback not found
            path: "*",
            component: NotFound,
            title: "404",
        },
    ],
    // some configs an callbacks
    fns: {
        // Base url path
        basePath: "",

        // On update route
        update: (component) => {
            //
        },

        init: () => {
            //
        },

        // middleware / before routing
        before: (next) => {
            //let to = setTimeout(() => {
            next();
            //clearTimeout(to);
            //}, 500);
        },

        // After routing
        after: () => {
            //
        },
    },
};
// export
export default routes;
```

|     name | value                                                                                                         |
| -------: | ------------------------------------------------------------------------------------------------------------- |
|   `path` | _[required]_ is the path show in address bar                                                                  |
|   `name` | _[required]_ name of the route                                                                                |
|     `do` | function callback `do:function(data){}`                                                                       |
| `params` | Dynamic parameters. Capture each part of defined parameter. `params:{param1:'',param2:''}` param1/param2/etc` |
|   `meta` | Custom data `{foo:bar}`                                                                                       |
|  `title` | page title `<title></title>`                                                                                  |

|             configs | Description                                  |
| ------------------: | -------------------------------------------- |
|          `basePath` | Base root path                               |
|            `init()` | First load                                   |
| `update(component)` | Callback on update component                 |
|          `before()` | Middleware function -> `next()` must be used |
|           `after()` | Callback after routed                        |

### App.svelte

```html
<script>
    // Import components
    import { RouterLink, RouterView } from "svelte-routed";
    // Import my routes
    import myroutes from "./routes.js";
</script>

<main>
    <nav>
        <RouterLink name="home">Home</RouterLink>
        <RouterLink name="about">About</RouterLink>
    </nav>
    <hr />
    <RouterView use="{myroutes}" />
</main>
```

### Availables props

| Attr       | Desc                                                                 |
| ---------- | -------------------------------------------------------------------- |
| `name`     | The name of the route. The same one declared on `routes.js`          |
| `part`     | If you use name, use `part` to pass search and hash `?x=0#hashvalue` |
| `path`     | Ypu can use `path` instead of `name`                                 |
| `title`    | The title attr of the "a" tag                                        |
| `cssClass` | Add classes to "a" tag                                               |
| `cssStyle` | Add styles to "a" tag                                                |

```html
<!-- Use path -->
<RouterLink
    path="/about?x=0#myhash"
    title="mytitle"
    cssClass="classes"
    cssStyle="styles"
    >About</RouterLink
>
<!-- Use name and use part for search and hash-->
<RouterLink
    name="about"
    part="?x=0#myhash"
    title="mytitle"
    cssClass="classes"
    cssStyle="styles"
    >About</RouterLink
>
```

### Routing the components

Routed components can fetch `RouterLink` and `Router`.

Example:

#### Home.svelte (routed)

```html
<script>
    // fetch components
    export let RouterLink, Router;

    // Access to Router
    console.log(Router.params, Router.meta, Router);
</script>

<div>
    <RouterLink name="about" part="?x=0#myhash">About</RouterLink>
</div>
```

### Programmatically route

`Router.navigateTo('/path')`

```html
// AnyRoutedViewComponent.svelte
<script>
    export let Router;
    Router.navigateTo("/about");
</script>
```

IMPORTANT: If you are outside of a routed component, use store \$Router importing `Router`;

```html
<script>
    // Import from global store
    import { Router } from "svelte-routed";
    // OnMount
    import { onMount } from "svelte";

    let somecondition = true;

    onMount(() => {
        // If some condition
        if (somecondition) {
            // Use $Router
            $Router.navigateTo("/my_path");
        }
    });
</script>

<div>Some content</div>
```

### Apache server SPA

For those who want to deploy on apache server add this to the .htaccess file.

```text

# In subfolder ------------

<IfModule mod_rewrite.c>
# replace delete basepath with yours.
# Take care of path slashes

RewriteEngine On

# remove trail slash
RewriteRule ^(.*)/$ basePath/$1 [L,R=301]

RewriteBase /basepath/
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /basePath/index.html [L]

</IfModule>

# In root -----------------

<IfModule mod_rewrite.c>
RewriteEngine On

# remove trail slash
RewriteRule ^(.*)/$ $1 [L,R=301]

RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

</IfModule>
```
