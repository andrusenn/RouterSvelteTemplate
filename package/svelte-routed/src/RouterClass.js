class RouterClass {
    constructor(routes, _config, _fn = null) {
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
        this._update = _fn;
        // Base
        this.base = this.config.basePath;
        this.urlBase = document.location.origin + this.base;
        // get link path part
        this.hash = "";
        this.search = "";
        this.title = document.title;
        this.titleInit = document.title;
        this.paths = [];
        this.meta = {};
        this.pathIndex = -1;
        this.path = document.location.pathname.replace(this.base, "");
        this.component = null;

        // Remove trail slash
        if (this.path !== "/") {
            this.path = this.path.replace(/\/$/gi, "");
        }

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
            this.paths.push(route.path);
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

        // Check if path is registered
        if (this._routes[this.pathIndex]) {
            // Process request --------

            // Check functions
            if (!this.hasParameters) {
                // If has default params
                if (this._routes[this.pathIndex].hasOwnProperty("params")) {
                    this.params = this._routes[this.pathIndex].params;
                }
            }
            // Meta
            if (this._routes[this.pathIndex].hasOwnProperty("meta")) {
                this.meta = this._routes[this.pathIndex].meta;
            }
            // Title
            if (this._routes[this.pathIndex].title) {
                this.title = this._routes[this.pathIndex].title;
            } else {
                this._routes[this.pathIndex].title = document.title;
                this.title = this.titleInit;
            }
            document.title = this.title;
            // Do
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
            // Fallback
            let fallbackIndex = this.paths.indexOf("*");

            if (this._routes[fallbackIndex].hasOwnProperty("do")) {
                this._routes[fallbackIndex].do();
            }
            if (this._routes[fallbackIndex].title) {
                this.title = this._routes[fallbackIndex].title;
            } else {
                this._routes[fallbackIndex].title = document.title;
                this.title = document.title;
            }
            this.component = this._routes[fallbackIndex].component;
            document.title = this.title;
        }
        // Push state
        try {
            history.pushState(
                {
                    search: this.search,
                    hash: this.hash,
                    params: this.params,
                    meta: this.meta,
                },
                this.title,
                this.path + this.search + this.hash,
            );
        } catch (e) {}

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
                this.middleware(e, null, this.config.before, this.backTo);
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
            let self = this;
            aLinks[i].onclick = function (e) {
                e.preventDefault();
                if (new URL(this.href).pathname === self.path) {
                    return false;
                }

                if (typeof self.config.before === "function") {
                    self.middleware(e, this, self.config.before, self.routeTo);
                } else {
                    self.routeTo(e, this);
                }

                if (typeof self.config.after === "function") {
                    self.config.after();
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

        // Remove trail slash
        if (this.path !== "/") {
            this.path = this.path.replace(/\/$/gi, "");
        }

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
            if (this._routes[this.pathIndex].title) {
                this.title = this._routes[this.pathIndex].title;
            }
            this.meta = state.meta;
            this.component = this._routes[this.pathIndex].component;
        } else {
            let fallbackIndex = this.paths.indexOf("*");

            if (this._routes[fallbackIndex].hasOwnProperty("do")) {
                this._routes[fallbackIndex].do();
            }
            this.component = this._routes[fallbackIndex].component;
            this.title = this._routes[fallbackIndex].title;
        }
        if (typeof this.config.update === "function") {
            this.config.update(this.component);
        }
        if (typeof this._update === "function") {
            this._update(this.component);
        }
        // Title
        if (this.title) {
            document.title = this.title;
        } else {
            document.title = this.titleInit;
        }
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
                            _params.push(decodeURI(parts[i]));
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

        // Remove trail slash
        if (this.path !== "/") {
            this.path = this.path.replace(/\/$/gi, "");
        }

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
                if (this._routes[this.pathIndex].title) {
                    this.title = this._routes[this.pathIndex].title;
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
        if (typeof this.config.update === "function") {
            this.config.update(this.component);
        }
        if (typeof this._update === "function") {
            this._update(this.component);
        }
        // Title
        if (this.title) {
            document.title = this.title;
        } else {
            document.title = this.titleInit;
        }
    }
    // middleware
    middleware(e, a, fn, exec) {
        let _exec = exec.bind(this);
        let next = function () {
            _exec(e, a);
        }.bind(_exec);
        fn(next);
    }
    // Action
    routeTo(e, a) {
        this.title = "";
        this.search = new URL(a.href).search;
        this.hash = new URL(a.href).hash;
        this.path = new URL(a.href).pathname;

        // Remove trail slash
        if (this.path !== "/") {
            this.path = this.path.replace(/\/$/gi, "");
        }

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
        if (typeof this.config.update === "function") {
            this.config.update(this.component);
        }
        if (typeof this._update === "function") {
            this._update(this.component);
        }
        // Title
        if (this.title) {
            document.title = this.title;
        } else {
            document.title = this.titleInit;
        }
    }
}
export default RouterClass;
