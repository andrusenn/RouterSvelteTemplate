
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
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
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
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

    function append(target, node) {
        target.appendChild(node);
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
    function space() {
        return text(' ');
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
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
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

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
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

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
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

    const RouterStore = writable(null);

    /* src/router/RouterLink.svelte generated by Svelte v3.24.0 */
    const file = "src/router/RouterLink.svelte";

    // (13:0) {#if $RouterStore}
    function create_if_block(ctx) {
    	let a;
    	let a_href_value;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	const block = {
    		c: function create() {
    			a = element("a");
    			if (default_slot) default_slot.c();
    			attr_dev(a, "href", a_href_value = /*$RouterStore*/ ctx[2].getPath(/*name*/ ctx[0]) + /*part*/ ctx[1]);
    			attr_dev(a, "router", "");
    			add_location(a, file, 13, 2, 236);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 8) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[3], dirty, null, null);
    				}
    			}

    			if (!current || dirty & /*$RouterStore, name, part*/ 7 && a_href_value !== (a_href_value = /*$RouterStore*/ ctx[2].getPath(/*name*/ ctx[0]) + /*part*/ ctx[1])) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(13:0) {#if $RouterStore}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$RouterStore*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$RouterStore*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$RouterStore*/ 4) {
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $RouterStore;
    	validate_store(RouterStore, "RouterStore");
    	component_subscribe($$self, RouterStore, $$value => $$invalidate(2, $RouterStore = $$value));
    	let { name } = $$props;
    	let { part = "" } = $$props;
    	const writable_props = ["name", "part"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<RouterLink> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("RouterLink", $$slots, ['default']);

    	$$self.$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("part" in $$props) $$invalidate(1, part = $$props.part);
    		if ("$$scope" in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		RouterStore,
    		onMount,
    		name,
    		part,
    		$RouterStore
    	});

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("part" in $$props) $$invalidate(1, part = $$props.part);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$RouterStore*/ 4) {
    			 {
    				if ($RouterStore) {
    					$RouterStore.start();
    				}
    			}
    		}
    	};

    	return [name, part, $RouterStore, $$scope, $$slots];
    }

    class RouterLink extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 0, part: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RouterLink",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console.warn("<RouterLink> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<RouterLink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<RouterLink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get part() {
    		throw new Error("<RouterLink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set part(value) {
    		throw new Error("<RouterLink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

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

    /* src/views/Home.svelte generated by Svelte v3.24.0 */

    const file$1 = "src/views/Home.svelte";

    function create_fragment$1(ctx) {
    	let h1;
    	let t1;
    	let p;
    	let t2_value = /*Router*/ ctx[0].params.p1 + "";
    	let t2;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Home";
    			t1 = space();
    			p = element("p");
    			t2 = text(t2_value);
    			add_location(h1, file$1, 4, 0, 41);
    			add_location(p, file$1, 5, 0, 55);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*Router*/ 1 && t2_value !== (t2_value = /*Router*/ ctx[0].params.p1 + "")) set_data_dev(t2, t2_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { Router } = $$props;
    	const writable_props = ["Router"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Home", $$slots, []);

    	$$self.$set = $$props => {
    		if ("Router" in $$props) $$invalidate(0, Router = $$props.Router);
    	};

    	$$self.$capture_state = () => ({ Router });

    	$$self.$inject_state = $$props => {
    		if ("Router" in $$props) $$invalidate(0, Router = $$props.Router);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [Router];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { Router: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*Router*/ ctx[0] === undefined && !("Router" in props)) {
    			console.warn("<Home> was created without expected prop 'Router'");
    		}
    	}

    	get Router() {
    		throw new Error("<Home>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set Router(value) {
    		throw new Error("<Home>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/views/About.svelte generated by Svelte v3.24.0 */

    const file$2 = "src/views/About.svelte";

    // (7:2) <RouterLink name="home">
    function create_default_slot(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("home");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(7:2) <RouterLink name=\\\"home\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let h1;
    	let t1;
    	let p;
    	let routerlink;
    	let current;

    	routerlink = new /*RouterLink*/ ctx[0]({
    			props: {
    				name: "home",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "About";
    			t1 = space();
    			p = element("p");
    			create_component(routerlink.$$.fragment);
    			add_location(h1, file$2, 4, 0, 45);
    			add_location(p, file$2, 5, 0, 60);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p, anchor);
    			mount_component(routerlink, p, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const routerlink_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				routerlink_changes.$$scope = { dirty, ctx };
    			}

    			routerlink.$set(routerlink_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(routerlink.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(routerlink.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p);
    			destroy_component(routerlink);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { RouterLink } = $$props;
    	const writable_props = ["RouterLink"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("About", $$slots, []);

    	$$self.$set = $$props => {
    		if ("RouterLink" in $$props) $$invalidate(0, RouterLink = $$props.RouterLink);
    	};

    	$$self.$capture_state = () => ({ RouterLink });

    	$$self.$inject_state = $$props => {
    		if ("RouterLink" in $$props) $$invalidate(0, RouterLink = $$props.RouterLink);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [RouterLink];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { RouterLink: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*RouterLink*/ ctx[0] === undefined && !("RouterLink" in props)) {
    			console.warn("<About> was created without expected prop 'RouterLink'");
    		}
    	}

    	get RouterLink() {
    		throw new Error("<About>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set RouterLink(value) {
    		throw new Error("<About>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/views/NotFound.svelte generated by Svelte v3.24.0 */

    const file$3 = "src/views/NotFound.svelte";

    function create_fragment$3(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Not Found";
    			add_location(h1, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NotFound> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("NotFound", $$slots, []);
    	return [];
    }

    class NotFound extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NotFound",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    // Components

    // Vars
    let routes = [
        // Paths
        {
            path: "/",
            name: "home",
            params: {
                p1: "",
            },
            component: Home,
            title: "Home",
        },
        {
            path: "/about",
            name: "about",
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
            window.scrollTo(0, 0);
        },
        before: (next) => {
            //let to = setTimeout(() => {
            next();
            //clearTimeout(to);
            //}, 500);
        },
    };

    /* src/router/RouterView.svelte generated by Svelte v3.24.0 */

    // (31:0) {#if Router}
    function create_if_block$1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		return {
    			props: { Router: /*Router*/ ctx[1], RouterLink },
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
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
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(31:0) {#if Router}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*Router*/ ctx[1] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
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
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $RouterStore;
    	validate_store(RouterStore, "RouterStore");
    	component_subscribe($$self, RouterStore, $$value => $$invalidate(3, $RouterStore = $$value));
    	let routerClass = null;
    	let component = null;
    	let Router = null;

    	// Mount
    	onMount(() => {
    		routerClass = new RouterClass(routes,
    		{
    				update: c => {
    					$$invalidate(0, component = c);
    					$$invalidate(1, Router = routerClass);
    					set_store_value(RouterStore, $RouterStore = routerClass);
    				},
    				...callbacks
    			});

    		routerClass.start();
    		$$invalidate(0, component = routerClass.component);
    		$$invalidate(1, Router = routerClass);
    		set_store_value(RouterStore, $RouterStore = routerClass);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<RouterView> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("RouterView", $$slots, []);

    	$$self.$capture_state = () => ({
    		RouterClass,
    		RouterLink,
    		RouterStore,
    		onMount,
    		routes,
    		callbacks,
    		routerClass,
    		component,
    		Router,
    		$RouterStore
    	});

    	$$self.$inject_state = $$props => {
    		if ("routerClass" in $$props) routerClass = $$props.routerClass;
    		if ("component" in $$props) $$invalidate(0, component = $$props.component);
    		if ("Router" in $$props) $$invalidate(1, Router = $$props.Router);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [component, Router];
    }

    class RouterView extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RouterView",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.24.0 */

    const { console: console_1 } = globals;
    const file$4 = "src/App.svelte";

    // (12:4) <RouterLink name="home">
    function create_default_slot_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Home");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(12:4) <RouterLink name=\\\"home\\\">",
    		ctx
    	});

    	return block;
    }

    // (13:4) <RouterLink name="about">
    function create_default_slot$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("About");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(13:4) <RouterLink name=\\\"about\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let main;
    	let nav;
    	let routerlink0;
    	let t0;
    	let routerlink1;
    	let t1;
    	let hr;
    	let t2;
    	let routerview;
    	let current;

    	routerlink0 = new RouterLink({
    			props: {
    				name: "home",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	routerlink1 = new RouterLink({
    			props: {
    				name: "about",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	routerview = new RouterView({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			nav = element("nav");
    			create_component(routerlink0.$$.fragment);
    			t0 = space();
    			create_component(routerlink1.$$.fragment);
    			t1 = space();
    			hr = element("hr");
    			t2 = space();
    			create_component(routerview.$$.fragment);
    			add_location(nav, file$4, 10, 2, 183);
    			add_location(hr, file$4, 14, 2, 294);
    			add_location(main, file$4, 9, 0, 174);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, nav);
    			mount_component(routerlink0, nav, null);
    			append_dev(nav, t0);
    			mount_component(routerlink1, nav, null);
    			append_dev(main, t1);
    			append_dev(main, hr);
    			append_dev(main, t2);
    			mount_component(routerview, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const routerlink0_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				routerlink0_changes.$$scope = { dirty, ctx };
    			}

    			routerlink0.$set(routerlink0_changes);
    			const routerlink1_changes = {};

    			if (dirty & /*$$scope*/ 2) {
    				routerlink1_changes.$$scope = { dirty, ctx };
    			}

    			routerlink1.$set(routerlink1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(routerlink0.$$.fragment, local);
    			transition_in(routerlink1.$$.fragment, local);
    			transition_in(routerview.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(routerlink0.$$.fragment, local);
    			transition_out(routerlink1.$$.fragment, local);
    			transition_out(routerview.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(routerlink0);
    			destroy_component(routerlink1);
    			destroy_component(routerview);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $RouterStore;
    	validate_store(RouterStore, "RouterStore");
    	component_subscribe($$self, RouterStore, $$value => $$invalidate(0, $RouterStore = $$value));
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$capture_state = () => ({
    		RouterLink,
    		RouterView,
    		RouterStore,
    		$RouterStore
    	});

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$RouterStore*/ 1) {
    			 {
    				if ($RouterStore) {
    					console.log($RouterStore.params);
    				}
    			}
    		}
    	};

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
