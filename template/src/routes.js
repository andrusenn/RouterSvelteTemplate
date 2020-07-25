// Components
import Home from "./views/Home.svelte";
import About from "./views/About.svelte";
import NotFound from "./views/NotFound.svelte";

// Vars
let routes = [
    // Paths
    {
        path: "/",
        name: "home",
        params: {
            param1: "",
            param2: "",
        },
        component: Home,
        title: "Home",
    },
    {
        path: "/about",
        name: "about",
        params: {
            param1: "",
        },
        component: About,
        title: "About",
    },
    {
        path: "*",
        component: NotFound,
        title: "404",
    },
];
let fns = {
    init: () => {
        window.scrollTo(0, 0);
    },
    before: (next) => {
        //let to = setTimeout(() => {
        next();
        //clearTimeout(to);
        //}, 500);
    },
};
export { routes, fns };