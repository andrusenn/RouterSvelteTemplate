class RouterClass {
    constructor(routes, _config) {
        /* APACHE SERVER
<IfModule mod_rewrite.c>
# replace basepath with yours
RewriteEngine On

# remove trail slash
RewriteRule ^(.*)/$ basePath/$1 [L,R=301]

RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /basePath/index.html [L]

</IfModule>
*/
        this.config = {
            basePath: "",
            init: null,
            before: null,
            after: null,
            update: null,
            ..._config,
        };
        this._routes = routes;
        if (typeof routes === "undefined") {
            return false;
        }
        // Base
        this.base = this.config.basePath;
        this.urlBase = document.location.origin + this.base;
        // get link path part
        this.hash = "";
        this.search = "";
        this.title = "";
        this.paths = [];
        this.meta = {};
        this.pathIndex = -1;
        this.path = document.location.pathname.replace(this.base, "");
        this.component = null;
        // Capture hash
        if (document.location.hash !== "") {
            this.hash = document.location.hash;
        }

        // Capture search
        if (document.location.search !== "") {
            this.search = document.location.search;
        }

        // Paths ---------------------------------
        for (let i = 0; i < this._routes.length; i++) {
            let route = this._routes[i];
            // if (
            //     this._routes[i].hasOwnProperty("alias") &&
            //     this._routes[i].alias !== null
            // ) {
            //     this.paths.push(route.alias);
            // } else {
            this.paths.push(route.path);
            // }
        }

        // Fallback -> create if not exists
        if (!this.paths.includes("*")) {
            this.paths.push("*");
            this._routes.push({
                path: "*",
                do: () => {
                    return false;
                },
                title: "404",
            });
        }

        // Index of path in paths
        this.pathIndex = this.getRealPathIndex();

        // check params
        this.checkParams();

        // Check functions
        if (!this.hasParameters) {
            if (this._routes[this.pathIndex]) {
                // If has default params
                if (this._routes[this.pathIndex].hasOwnProperty("params")) {
                    this.params = this._routes[this.pathIndex].params;
                }
                this.title = this._routes[this.pathIndex].title;
            }
        }

        // meta
        if (this._routes[this.pathIndex].hasOwnProperty("meta")) {
            this.meta = this._routes[this.pathIndex].meta;
        }
        // do the do
        if (this._routes[this.pathIndex]) {
            if (this._routes[this.pathIndex].hasOwnProperty("do")) {
                this._routes[this.pathIndex].do({
                    search: this.search,
                    hash: this.hash,
                    params: this.params,
                    meta: this.meta,
                });
            }
            this.component = this._routes[this.pathIndex].component;
        } else {
            let fallbackIndex = this.paths.indexOf("*");

            if (this._routes[fallbackIndex].hasOwnProperty("do")) {
                this._routes[fallbackIndex].do();
            }
            this.title = this._routes[fallbackIndex].title;
            this.component = this._routes[fallbackIndex].component;
        }
        // Pathname
        let pathname = document.location.pathname;

        // Title
        document.title = this.title;

        // Push state
        history.pushState(
            {
                search: this.search,
                hash: this.hash,
                params: this.params,
                meta: this.meta,
            },
            this.title,
            pathname + this.search + this.hash,
        );

        // Init --------------------
        if (typeof this.config.init === "function") {
            this.config.init({
                search: this.search,
                hash: this.hash,
                params: this.params,
                meta: this.meta,
            });
        }
        // History
        window.addEventListener("popstate", (e) => {
            if (typeof this.config.before === "function") {
                this.middleware(e, this.config.before, this.backTo);
            } else {
                this.backTo(e);
            }
        });
    }
    start() {
        // GEt all links with route attribute
        let aLinks = document.querySelectorAll("a[router]");
        // Click events
        for (let i = 0; i < aLinks.length; i++) {
            aLinks[i].removeAttribute("onclick");
            let vattr = aLinks[i].getAttribute("router");
            if (vattr !== "") {
                let index = this.paths.indexOf(this.getPath(vattr));
                if (index !== -1) {
                    aLinks[i].href = this._routes[index].path;
                }
            }
            aLinks[i].onclick = (e) => {
                e.preventDefault();
                if (new URL(e.target.href).pathname === this.path) {
                    return false;
                }

                if (typeof this.config.before === "function") {
                    this.middleware(e, this.config.before, this.routeTo);
                } else {
                    this.routeTo(e);
                }

                if (typeof this.config.after === "function") {
                    this.config.after();
                }
                return false;
            };
        }
    }

    getPath(name) {
        let path = "";
        for (let i = 0; i < this._routes.length; i++) {
            if (name === this._routes[i].name) {
                path = this._routes[i].path;
                break;
            }
        }
        return path;
    }
    checkParams() {
        // check params
        this.hasParameters = false;
        this.params = {};
        this.getParameters();
    }
    backTo(e) {
        this.path = document.location.pathname.replace(this.base, "");

        // Index of path in paths
        this.pathIndex = this.getRealPathIndex();
        this.checkParams();

        if (this._routes[this.pathIndex]) {
            let state = e.state ? e.state : {};
            //params
            if (this._routes[this.pathIndex].hasOwnProperty("params")) {
                this._routes[this.pathIndex].params = state.params;
            }
            // meta
            if (this._routes[this.pathIndex].hasOwnProperty("meta")) {
                this._routes[this.pathIndex].meta = state.meta;
            }

            if (this._routes[this.pathIndex].hasOwnProperty("do")) {
                this._routes[this.pathIndex].do(state);
            }
            document.title = this._routes[this.pathIndex].title;
            this.meta = state.meta;
            this.component = this._routes[this.pathIndex].component;
        } else {
            let fallbackIndex = this.paths.indexOf("*");

            if (this._routes[fallbackIndex].hasOwnProperty("do")) {
                this._routes[fallbackIndex].do();
            }
            this.component = this._routes[fallbackIndex].component;
            document.title = this._routes[fallbackIndex].title;
        }
        this.config.update(this.component);
    }
    getRealPathIndex() {
        let realPath = "/";
        let parts = this.path.split("/");
        let index = this.paths.indexOf(this.path);
        if (!this._routes[index]) {
            parts.shift();

            if (parts.length > 0) {
                let pathCont = "";
                for (let i = 0; i < parts.length; i++) {
                    pathCont += "/" + parts[i];

                    // Check if a part of the path exists
                    if (this.paths.indexOf(pathCont) !== -1) {
                        realPath = pathCont;
                    }
                }
            }
            return this.paths.indexOf(realPath);
        } else {
            return index;
        }
    }
    getParameters() {
        let index = this.paths.indexOf(this.path);
        if (!this._routes[index]) {
            let parts = this.path.split("/");
            parts.shift();

            if (parts.length > 0) {
                let pathCont = "";
                let realPath = "/";
                let indexRealPath = -1;
                let _params = [];
                let declaredParams = {};
                let numDeclaredParams = 0;

                for (let i = 0; i < parts.length; i++) {
                    pathCont += "/" + parts[i];

                    // Check if a part of the path exists
                    if (this.paths.indexOf(pathCont) !== -1) {
                        realPath = pathCont;
                    } else {
                        // Part of real path
                        indexRealPath = this.paths.indexOf(realPath);

                        if (
                            this._routes[indexRealPath] &&
                            this._routes[indexRealPath].hasOwnProperty("params")
                        ) {
                            _params.push(parts[i]);
                        }
                    }
                }
                if (_params.length > 0) {
                    this.hasParameters = true;
                }
                if (this.hasParameters) {
                    // GEt num declared params
                    declaredParams = Object.keys(
                        this._routes[indexRealPath].params,
                    );
                    numDeclaredParams = declaredParams.length;
                    // Si tiene parametros
                    if (_params.length <= numDeclaredParams) {
                        //if (_routes[indexRealPath]) {
                        for (let i = 0; i < numDeclaredParams; i++) {
                            let p = _params[i] ? _params[i] : "";
                            this._routes[indexRealPath].params[
                                declaredParams[i]
                            ] = p;
                        }

                        // DO ---------------
                        this.params = this._routes[indexRealPath].params;
                        this.title = this._routes[indexRealPath].title;
                        // meta
                        if (
                            this._routes[indexRealPath].hasOwnProperty("meta")
                        ) {
                            this.meta = this._routes[indexRealPath].meta;
                        }
                        this.component = this._routes[indexRealPath].component;
                        //}
                    } else {
                        this.hasParameters = false;
                        this.pathIndex = this.paths.indexOf(index);
                    }
                } else {
                    this.pathIndex = this.paths.indexOf(index);
                }
            }
        }
    }
    navigateTo(path) {
        this.title = "";
        this.search = new URL(this.urlBase + path).search;
        this.hash = new URL(this.urlBase + path).hash;
        this.path = new URL(this.urlBase + path).pathname;

        // Index of path in paths
        this.pathIndex = this.getRealPathIndex();

        // check params
        this.checkParams();

        // Normal fallback ---------------------------------
        if (!this.hasParameters) {
            if (this._routes[this.pathIndex]) {
                // params
                if (this._routes[this.pathIndex].hasOwnProperty("params")) {
                    let listParams = Object.keys(
                        this._routes[this.pathIndex].params,
                    );
                    listParams.forEach((param) => {
                        this.params[param] = "";
                    });
                }
                // meta
                if (this._routes[this.pathIndex].hasOwnProperty("meta")) {
                    this.meta = this._routes[this.pathIndex].meta;
                }

                if (this._routes[this.pathIndex].hasOwnProperty("do")) {
                    this._routes[this.pathIndex].do({
                        search: this.search,
                        hash: this.hash,
                        params: this.params,
                        meta: this.meta,
                    });
                }
                this.title = this._routes[this.pathIndex].title;
                this.component = this._routes[this.pathIndex].component;
            } else {
                let fallbackIndex = this.paths.indexOf("*");

                if (this._routes[fallbackIndex].hasOwnProperty("do")) {
                    this._routes[fallbackIndex].do();
                }
                this.title = this._routes[fallbackIndex].title;
                this.component = this._routes[fallbackIndex].component;
            }
        } else {
            if (this._routes[this.pathIndex].hasOwnProperty("do")) {
                this._routes[this.pathIndex].do({
                    search: this.search,
                    hash: this.hash,
                    params: this.params,
                    meta: this.meta,
                });
            }
            this.component = this._routes[this.pathIndex].component;
        }
        // Title
        document.title = this.title;
        // Push state
        history.pushState(
            {
                search: this.search,
                hash: this.hash,
                params: this.params,
                meta: this.meta,
            },
            this.title,
            this.base + this.path + this.search + this.hash,
        );
        this.config.update(this.component);
    }
    // middleware
    middleware(e, fn, exec) {
        let _exec = exec.bind(this);
        let next = function () {
            _exec(e);
        }.bind(_exec);
        fn(next);
    }
    // Action
    routeTo(e) {
        this.title = "";
        this.search = new URL(e.target.href).search;
        this.hash = new URL(e.target.href).hash;
        this.path = new URL(e.target.href).pathname;
        this.meta = {};
        // Index of path in paths
        this.pathIndex = this.getRealPathIndex();

        // check params
        this.checkParams();

        // Normal fallback ---------------------------------
        if (!this.hasParameters) {
            if (this._routes[this.pathIndex]) {
                // params
                if (this._routes[this.pathIndex].hasOwnProperty("params")) {
                    let listParams = Object.keys(
                        this._routes[this.pathIndex].params,
                    );
                    listParams.forEach((param) => {
                        this.params[param] = "";
                    });
                }
                // meta
                if (this._routes[this.pathIndex].hasOwnProperty("meta")) {
                    this.meta = this._routes[this.pathIndex].meta;
                }

                if (this._routes[this.pathIndex].hasOwnProperty("do")) {
                    this._routes[this.pathIndex].do({
                        search: this.search,
                        hash: this.hash,
                        params: this.params,
                        meta: this.meta,
                    });
                }
                this.title = this._routes[this.pathIndex].title;
                this.component = this._routes[this.pathIndex].component;
            } else {
                let fallbackIndex = this.paths.indexOf("*");

                if (this._routes[fallbackIndex].hasOwnProperty("do")) {
                    this._routes[fallbackIndex].do();
                }
                this.title = this._routes[fallbackIndex].title;
                this.component = this._routes[fallbackIndex].component;
            }
        } else {
            if (this._routes[this.pathIndex].hasOwnProperty("do")) {
                this._routes[this.pathIndex].do({
                    search: this.search,
                    hash: this.hash,
                    params: this.params,
                    meta: this.meta,
                });
            }
            this.component = this._routes[this.pathIndex].component;
        }
        // Title
        document.title = this.title;
        // Push state
        history.pushState(
            {
                search: this.search,
                hash: this.hash,
                params: this.params,
                meta: this.meta,
            },
            this.title,
            this.base + this.path + this.search + this.hash,
        );
        this.config.update(this.component);
    }
}
export default RouterClass;
