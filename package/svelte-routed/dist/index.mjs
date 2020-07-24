function noop() { }
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function subscribe(store, ...callbacks) {
    if (store == null) {
        return noop;
    }
    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function component_subscribe(component, store, callback) {
    component.$$.on_destroy.push(subscribe(store, callback));
}
function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
        const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
        return definition[0](slot_ctx);
    }
}
function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn
        ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
        : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
        const lets = definition[2](fn(dirty));
        if ($$scope.dirty === undefined) {
            return lets;
        }
        if (typeof lets === 'object') {
            const merged = [];
            const len = Math.max($$scope.dirty.length, lets.length);
            for (let i = 0; i < len; i += 1) {
                merged[i] = $$scope.dirty[i] | lets[i];
            }
            return merged;
        }
        return $$scope.dirty | lets;
    }
    return $$scope.dirty;
}
function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
    const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
    if (slot_changes) {
        const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
        slot.p(slot_context, slot_changes);
    }
}
function set_store_value(store, ret, value = ret) {
    store.set(value);
    return ret;
}
function action_destroyer(action_result) {
    return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function element(name) {
    return document.createElement(name);
}
function text(data) {
    return document.createTextNode(data);
}
function empty() {
    return text('');
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        dirty_components.length = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);
        if (on_destroy) {
            on_destroy.push(...new_on_destroy);
        }
        else {
            // Edge case - component was destroyed immediately,
            // most likely as a result of a binding initialising
            run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if ($$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set() {
        // overridden by instance, if it has props
    }
}

const subscriber_queue = [];
/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 * @param {*=}value initial value
 * @param {StartStopNotifier=}start start and stop notifications for subscriptions
 */
function writable(value, start = noop) {
    let stop;
    const subscribers = [];
    function set(new_value) {
        if (safe_not_equal(value, new_value)) {
            value = new_value;
            if (stop) { // store is ready
                const run_queue = !subscriber_queue.length;
                for (let i = 0; i < subscribers.length; i += 1) {
                    const s = subscribers[i];
                    s[1]();
                    subscriber_queue.push(s, value);
                }
                if (run_queue) {
                    for (let i = 0; i < subscriber_queue.length; i += 2) {
                        subscriber_queue[i][0](subscriber_queue[i + 1]);
                    }
                    subscriber_queue.length = 0;
                }
            }
        }
    }
    function update(fn) {
        set(fn(value));
    }
    function subscribe(run, invalidate = noop) {
        const subscriber = [run, invalidate];
        subscribers.push(subscriber);
        if (subscribers.length === 1) {
            stop = start(set) || noop;
        }
        run(value);
        return () => {
            const index = subscribers.indexOf(subscriber);
            if (index !== -1) {
                subscribers.splice(index, 1);
            }
            if (subscribers.length === 0) {
                stop();
                stop = null;
            }
        };
    }
    return { set, update, subscribe };
}

const Router = writable(null);

/* src/RouterLink.svelte generated by Svelte v3.24.0 */

function create_if_block(ctx) {
	let a;
	let a_href_value;
	let start_action;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*$$slots*/ ctx[9].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

	return {
		c() {
			a = element("a");
			if (default_slot) default_slot.c();
			attr(a, "href", a_href_value = /*$Router*/ ctx[6].getPath(/*name*/ ctx[0]) + /*part*/ ctx[5]);
			attr(a, "class", /*cssClass*/ ctx[1]);
			attr(a, "style", /*cssStyle*/ ctx[2]);
			attr(a, "title", /*title*/ ctx[3]);
			attr(a, "role", /*role*/ ctx[4]);
			attr(a, "router", "");
		},
		m(target, anchor) {
			insert(target, a, anchor);

			if (default_slot) {
				default_slot.m(a, null);
			}

			current = true;

			if (!mounted) {
				dispose = action_destroyer(start_action = /*start*/ ctx[7].call(null, a));
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 256) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], dirty, null, null);
				}
			}

			if (!current || dirty & /*$Router, name, part*/ 97 && a_href_value !== (a_href_value = /*$Router*/ ctx[6].getPath(/*name*/ ctx[0]) + /*part*/ ctx[5])) {
				attr(a, "href", a_href_value);
			}

			if (!current || dirty & /*cssClass*/ 2) {
				attr(a, "class", /*cssClass*/ ctx[1]);
			}

			if (!current || dirty & /*cssStyle*/ 4) {
				attr(a, "style", /*cssStyle*/ ctx[2]);
			}

			if (!current || dirty & /*title*/ 8) {
				attr(a, "title", /*title*/ ctx[3]);
			}

			if (!current || dirty & /*role*/ 16) {
				attr(a, "role", /*role*/ ctx[4]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(a);
			if (default_slot) default_slot.d(detaching);
			mounted = false;
			dispose();
		}
	};
}

function create_fragment(ctx) {
	let if_block_anchor;
	let current;
	let if_block = /*$Router*/ ctx[6] && create_if_block(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (/*$Router*/ ctx[6]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*$Router*/ 64) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let $Router;
	component_subscribe($$self, Router, $$value => $$invalidate(6, $Router = $$value));

	let { name } = $$props,
		{ cssClass } = $$props,
		{ cssStyle } = $$props,
		{ title } = $$props,
		{ role = "link" } = $$props,
		{ part = "" } = $$props;

	function start(node) {
		$Router.start();

		return {
			destroy() {
				
			}
		};
	}

	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$props => {
		if ("name" in $$props) $$invalidate(0, name = $$props.name);
		if ("cssClass" in $$props) $$invalidate(1, cssClass = $$props.cssClass);
		if ("cssStyle" in $$props) $$invalidate(2, cssStyle = $$props.cssStyle);
		if ("title" in $$props) $$invalidate(3, title = $$props.title);
		if ("role" in $$props) $$invalidate(4, role = $$props.role);
		if ("part" in $$props) $$invalidate(5, part = $$props.part);
		if ("$$scope" in $$props) $$invalidate(8, $$scope = $$props.$$scope);
	};

	return [name, cssClass, cssStyle, title, role, part, $Router, start, $$scope, $$slots];
}

class RouterLink extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance, create_fragment, safe_not_equal, {
			name: 0,
			cssClass: 1,
			cssStyle: 2,
			title: 3,
			role: 4,
			part: 5
		});
	}
}

class RouterClass {
    constructor(routes, _config) {
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
        if (
            this._routes[this.pathIndex] &&
            this._routes[this.pathIndex].hasOwnProperty("meta")
        ) {
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

/* src/RouterView.svelte generated by Svelte v3.24.0 */

function create_if_block$1(ctx) {
	let switch_instance;
	let switch_instance_anchor;
	let current;
	var switch_value = /*component*/ ctx[0];

	function switch_props(ctx) {
		return {
			props: { Router: /*Router*/ ctx[1], RouterLink }
		};
	}

	if (switch_value) {
		switch_instance = new switch_value(switch_props(ctx));
	}

	return {
		c() {
			if (switch_instance) create_component(switch_instance.$$.fragment);
			switch_instance_anchor = empty();
		},
		m(target, anchor) {
			if (switch_instance) {
				mount_component(switch_instance, target, anchor);
			}

			insert(target, switch_instance_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const switch_instance_changes = {};
			if (dirty & /*Router*/ 2) switch_instance_changes.Router = /*Router*/ ctx[1];

			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
				if (switch_instance) {
					group_outros();
					const old_component = switch_instance;

					transition_out(old_component.$$.fragment, 1, 0, () => {
						destroy_component(old_component, 1);
					});

					check_outros();
				}

				if (switch_value) {
					switch_instance = new switch_value(switch_props(ctx));
					create_component(switch_instance.$$.fragment);
					transition_in(switch_instance.$$.fragment, 1);
					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
				} else {
					switch_instance = null;
				}
			} else if (switch_value) {
				switch_instance.$set(switch_instance_changes);
			}
		},
		i(local) {
			if (current) return;
			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
			current = true;
		},
		o(local) {
			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(switch_instance_anchor);
			if (switch_instance) destroy_component(switch_instance, detaching);
		}
	};
}

function create_fragment$1(ctx) {
	let if_block_anchor;
	let current;
	let if_block = /*Router*/ ctx[1] && create_if_block$1(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (/*Router*/ ctx[1]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*Router*/ 2) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$1(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let $RouterStore;
	component_subscribe($$self, Router, $$value => $$invalidate(4, $RouterStore = $$value));
	let { use = { routes: [], fns: {} } } = $$props;
	let routerClass = null;
	let component = null;
	let Router$1 = null;

	onMount(() => {
		routerClass = new RouterClass(use.routes,
		{
				update: c => {
					$$invalidate(0, component = c);
					$$invalidate(1, Router$1 = routerClass);
					set_store_value(Router, $RouterStore = routerClass);
				},
				...use.fns
			});

		$$invalidate(0, component = routerClass.component);
		$$invalidate(1, Router$1 = routerClass);
		set_store_value(Router, $RouterStore = routerClass);
	});

	$$self.$set = $$props => {
		if ("use" in $$props) $$invalidate(2, use = $$props.use);
	};

	return [component, Router$1, use];
}

class RouterView extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { use: 2 });
	}
}

export { Router, RouterLink, RouterView };
