
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    // Adapted from https://github.com/then/is-promise/blob/master/index.js
    // Distributed under MIT License https://github.com/then/is-promise/blob/master/LICENSE
    function is_promise(value) {
        return !!value && (typeof value === 'object' || typeof value === 'function') && typeof value.then === 'function';
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
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
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
        else if (callback) {
            callback();
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function update_await_block_branch(info, ctx, dirty) {
        const child_ctx = ctx.slice();
        const { resolved } = info;
        if (info.current === info.then) {
            child_ctx[info.value] = resolved;
        }
        if (info.current === info.catch) {
            child_ctx[info.error] = resolved;
        }
        info.block.p(child_ctx, dirty);
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
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
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.55.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/Header.svelte generated by Svelte v3.55.1 */

    const file$5 = "src/components/Header.svelte";

    function create_fragment$5(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Events Tracker";
    			attr_dev(h1, "class", "display-1 svelte-669z50");
    			add_location(h1, file$5, 4, 0, 21);
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
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Header', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$5.name
    		});
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
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
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
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    let now = new Date();

    const year = writable(now.getFullYear());
    const month = writable(now.getMonth());
    const day = writable(now.getDate());

    /* src/components/ActionBox.svelte generated by Svelte v3.55.1 */
    const file$4 = "src/components/ActionBox.svelte";

    // (67:16) {:else}
    function create_else_block_1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Add action";
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-outline-success svelte-gq4ckm");
    			add_location(button, file$4, 67, 20, 1929);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*post_event*/ ctx[6](/*action_idd*/ ctx[1]))) /*post_event*/ ctx[6](/*action_idd*/ ctx[1]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(67:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (65:16) {#if posted_today}
    function create_if_block_1(ctx) {
    	let button;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Add action";
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-outline-secondary svelte-gq4ckm");
    			button.disabled = true;
    			add_location(button, file$4, 65, 20, 1800);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(65:16) {#if posted_today}",
    		ctx
    	});

    	return block;
    }

    // (74:16) {:else}
    function create_else_block(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Remove last event";
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-outline-warning btn-remove svelte-gq4ckm");
    			add_location(button, file$4, 74, 20, 2275);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*delete_event*/ ctx[7](/*last_event_idd*/ ctx[5]))) /*delete_event*/ ctx[7](/*last_event_idd*/ ctx[5]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(74:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (72:16) {#if remove_button_disabled }
    function create_if_block(ctx) {
    	let button;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Remove last event";
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-outline-secondary btn-remove svelte-gq4ckm");
    			button.disabled = true;
    			add_location(button, file$4, 72, 20, 2127);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(72:16) {#if remove_button_disabled }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let h5;
    	let t0;
    	let t1;
    	let span;
    	let t2;
    	let t3;
    	let t4;
    	let t5;

    	function select_block_type(ctx, dirty) {
    		if (/*posted_today*/ ctx[2]) return create_if_block_1;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*remove_button_disabled*/ ctx[4]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			t0 = text(/*action_name*/ ctx[0]);
    			t1 = space();
    			span = element("span");
    			t2 = text("Status: ");
    			t3 = text(/*action_status*/ ctx[3]);
    			t4 = space();
    			if_block0.c();
    			t5 = space();
    			if_block1.c();
    			attr_dev(h5, "class", "card-title svelte-gq4ckm");
    			add_location(h5, file$4, 60, 16, 1611);
    			attr_dev(span, "class", "card-status svelte-gq4ckm");
    			add_location(span, file$4, 62, 16, 1687);
    			attr_dev(div0, "class", "card-button-container svelte-gq4ckm");
    			add_location(div0, file$4, 59, 8, 1559);
    			attr_dev(div1, "class", "card-body");
    			add_location(div1, file$4, 58, 4, 1527);
    			attr_dev(div2, "class", "card svelte-gq4ckm");
    			add_location(div2, file$4, 57, 0, 1504);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h5);
    			append_dev(h5, t0);
    			append_dev(div0, t1);
    			append_dev(div0, span);
    			append_dev(span, t2);
    			append_dev(span, t3);
    			append_dev(div0, t4);
    			if_block0.m(div0, null);
    			append_dev(div0, t5);
    			if_block1.m(div0, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*action_name*/ 1) set_data_dev(t0, /*action_name*/ ctx[0]);
    			if (dirty & /*action_status*/ 8) set_data_dev(t3, /*action_status*/ ctx[3]);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div0, t5);
    				}
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div0, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_block0.d();
    			if_block1.d();
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ActionBox', slots, []);
    	let { action_name } = $$props;
    	let { action_idd } = $$props;
    	let { posted_today } = $$props;
    	let action_status = '';
    	let remove_button_disabled = true;
    	let last_event_idd = null;

    	function check_posting(posted_today) {
    		if (posted_today) {
    			$$invalidate(3, action_status = 'POSTED TODAY');
    		} else {
    			$$invalidate(3, action_status = '');
    		}
    	}

    	check_posting(posted_today);

    	async function post_event(action_idd) {
    		const response = await fetch(`/event-post?action-idd=${action_idd}`, { method: 'POST' });

    		if (response.ok) {
    			const respond = await response.json();

    			if (respond['actions_events_existed'] == true) {
    				$$invalidate(3, action_status = '- action already posted today');
    			}

    			if (respond['posted'] == true) {
    				$$invalidate(3, action_status = 'POSTED');
    				$$invalidate(4, remove_button_disabled = false);
    				$$invalidate(5, last_event_idd = respond['events_idd']);
    			}
    		} else {
    			$$invalidate(3, action_status = 'error during posting');
    		}
    	}

    	async function delete_event(event_idd) {
    		if (last_event_idd != null) {
    			const response = await fetch(`/event-delete?event-idd=${event_idd}`, { method: 'POST' });

    			if (response.ok) {
    				$$invalidate(3, action_status = 'REMOVED');
    				$$invalidate(4, remove_button_disabled = true);
    			}
    		}
    	}

    	$$self.$$.on_mount.push(function () {
    		if (action_name === undefined && !('action_name' in $$props || $$self.$$.bound[$$self.$$.props['action_name']])) {
    			console.warn("<ActionBox> was created without expected prop 'action_name'");
    		}

    		if (action_idd === undefined && !('action_idd' in $$props || $$self.$$.bound[$$self.$$.props['action_idd']])) {
    			console.warn("<ActionBox> was created without expected prop 'action_idd'");
    		}

    		if (posted_today === undefined && !('posted_today' in $$props || $$self.$$.bound[$$self.$$.props['posted_today']])) {
    			console.warn("<ActionBox> was created without expected prop 'posted_today'");
    		}
    	});

    	const writable_props = ['action_name', 'action_idd', 'posted_today'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ActionBox> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('action_name' in $$props) $$invalidate(0, action_name = $$props.action_name);
    		if ('action_idd' in $$props) $$invalidate(1, action_idd = $$props.action_idd);
    		if ('posted_today' in $$props) $$invalidate(2, posted_today = $$props.posted_today);
    	};

    	$$self.$capture_state = () => ({
    		year,
    		month,
    		day,
    		action_name,
    		action_idd,
    		posted_today,
    		action_status,
    		remove_button_disabled,
    		last_event_idd,
    		check_posting,
    		post_event,
    		delete_event
    	});

    	$$self.$inject_state = $$props => {
    		if ('action_name' in $$props) $$invalidate(0, action_name = $$props.action_name);
    		if ('action_idd' in $$props) $$invalidate(1, action_idd = $$props.action_idd);
    		if ('posted_today' in $$props) $$invalidate(2, posted_today = $$props.posted_today);
    		if ('action_status' in $$props) $$invalidate(3, action_status = $$props.action_status);
    		if ('remove_button_disabled' in $$props) $$invalidate(4, remove_button_disabled = $$props.remove_button_disabled);
    		if ('last_event_idd' in $$props) $$invalidate(5, last_event_idd = $$props.last_event_idd);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		action_name,
    		action_idd,
    		posted_today,
    		action_status,
    		remove_button_disabled,
    		last_event_idd,
    		post_event,
    		delete_event
    	];
    }

    class ActionBox extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			action_name: 0,
    			action_idd: 1,
    			posted_today: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ActionBox",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get action_name() {
    		throw new Error("<ActionBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set action_name(value) {
    		throw new Error("<ActionBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get action_idd() {
    		throw new Error("<ActionBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set action_idd(value) {
    		throw new Error("<ActionBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get posted_today() {
    		throw new Error("<ActionBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set posted_today(value) {
    		throw new Error("<ActionBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/ActionsCategoryBox.svelte generated by Svelte v3.55.1 */
    const file$3 = "src/components/ActionsCategoryBox.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i].action_idd;
    	child_ctx[3] = list[i].action_name;
    	child_ctx[4] = list[i].posted_today;
    	return child_ctx;
    }

    // (16:8) {#each actions_list as {action_idd, action_name, posted_today}}
    function create_each_block$1(ctx) {
    	let actionbox;
    	let current;

    	actionbox = new ActionBox({
    			props: {
    				action_idd: /*action_idd*/ ctx[2],
    				action_name: /*action_name*/ ctx[3],
    				posted_today: /*posted_today*/ ctx[4]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(actionbox.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(actionbox, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const actionbox_changes = {};
    			if (dirty & /*actions_list*/ 2) actionbox_changes.action_idd = /*action_idd*/ ctx[2];
    			if (dirty & /*actions_list*/ 2) actionbox_changes.action_name = /*action_name*/ ctx[3];
    			if (dirty & /*actions_list*/ 2) actionbox_changes.posted_today = /*posted_today*/ ctx[4];
    			actionbox.$set(actionbox_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(actionbox.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(actionbox.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(actionbox, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(16:8) {#each actions_list as {action_idd, action_name, posted_today}}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div2;
    	let div0;
    	let h3;
    	let t0;
    	let t1;
    	let div1;
    	let current;
    	let each_value = /*actions_list*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			t0 = text(/*category_name*/ ctx[0]);
    			t1 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h3, "class", "display-5 svelte-12sxu3w");
    			add_location(h3, file$3, 12, 8, 257);
    			attr_dev(div0, "class", "row");
    			add_location(div0, file$3, 11, 4, 231);
    			attr_dev(div1, "class", "row");
    			add_location(div1, file$3, 14, 4, 315);
    			attr_dev(div2, "class", "container actionsCategoryBox svelte-12sxu3w");
    			add_location(div2, file$3, 10, 0, 184);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, h3);
    			append_dev(h3, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*category_name*/ 1) set_data_dev(t0, /*category_name*/ ctx[0]);

    			if (dirty & /*actions_list*/ 2) {
    				each_value = /*actions_list*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
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

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ActionsCategoryBox', slots, []);
    	let { category_name } = $$props;
    	let { actions_list } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (category_name === undefined && !('category_name' in $$props || $$self.$$.bound[$$self.$$.props['category_name']])) {
    			console.warn("<ActionsCategoryBox> was created without expected prop 'category_name'");
    		}

    		if (actions_list === undefined && !('actions_list' in $$props || $$self.$$.bound[$$self.$$.props['actions_list']])) {
    			console.warn("<ActionsCategoryBox> was created without expected prop 'actions_list'");
    		}
    	});

    	const writable_props = ['category_name', 'actions_list'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ActionsCategoryBox> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('category_name' in $$props) $$invalidate(0, category_name = $$props.category_name);
    		if ('actions_list' in $$props) $$invalidate(1, actions_list = $$props.actions_list);
    	};

    	$$self.$capture_state = () => ({
    		ActionBox,
    		year,
    		month,
    		day,
    		category_name,
    		actions_list
    	});

    	$$self.$inject_state = $$props => {
    		if ('category_name' in $$props) $$invalidate(0, category_name = $$props.category_name);
    		if ('actions_list' in $$props) $$invalidate(1, actions_list = $$props.actions_list);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [category_name, actions_list];
    }

    class ActionsCategoryBox extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { category_name: 0, actions_list: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ActionsCategoryBox",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get category_name() {
    		throw new Error("<ActionsCategoryBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set category_name(value) {
    		throw new Error("<ActionsCategoryBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get actions_list() {
    		throw new Error("<ActionsCategoryBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set actions_list(value) {
    		throw new Error("<ActionsCategoryBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/ActionsDate.svelte generated by Svelte v3.55.1 */
    const file$2 = "src/components/ActionsDate.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let button0;
    	let t1;
    	let span;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "-1";
    			t1 = space();
    			span = element("span");
    			t2 = text(/*year_number*/ ctx[0]);
    			t3 = text("-");
    			t4 = text(/*month_string*/ ctx[1]);
    			t5 = text("-");
    			t6 = text(/*day_string*/ ctx[2]);
    			t7 = space();
    			button1 = element("button");
    			button1.textContent = "+1";
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "btn btn-secondary");
    			add_location(button0, file$2, 52, 4, 1261);
    			attr_dev(span, "class", "dateString svelte-gvmcps");
    			add_location(span, file$2, 53, 4, 1352);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-secondary");
    			add_location(button1, file$2, 54, 4, 1430);
    			attr_dev(div, "class", "actionsDate container svelte-gvmcps");
    			add_location(div, file$2, 51, 0, 1220);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			append_dev(div, t1);
    			append_dev(div, span);
    			append_dev(span, t2);
    			append_dev(span, t3);
    			append_dev(span, t4);
    			append_dev(span, t5);
    			append_dev(span, t6);
    			append_dev(div, t7);
    			append_dev(div, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*deacrement_date*/ ctx[4], false, false, false),
    					listen_dev(button1, "click", /*increment_date*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*year_number*/ 1) set_data_dev(t2, /*year_number*/ ctx[0]);
    			if (dirty & /*month_string*/ 2) set_data_dev(t4, /*month_string*/ ctx[1]);
    			if (dirty & /*day_string*/ 4) set_data_dev(t6, /*day_string*/ ctx[2]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ActionsDate', slots, []);
    	let year_number;
    	let month_number;
    	let day_number;
    	let month_string;
    	let day_string;
    	year.subscribe(value => $$invalidate(0, year_number = value));

    	month.subscribe(value => {
    		month_number = value;

    		if (value < 10) {
    			$$invalidate(1, month_string = '0' + (value + 1));
    		} else {
    			$$invalidate(1, month_string = '' + (value + 1));
    		}
    	});

    	day.subscribe(value => {
    		day_number = value;

    		if (value < 10) {
    			$$invalidate(2, day_string = '0' + value);
    		} else {
    			$$invalidate(2, day_string = '' + value);
    		}
    	});

    	function increment_date() {
    		let new_date = new Date(year_number, month_number, day_number);
    		new_date.setDate(new_date.getDate() + 1);
    		year.set(new_date.getFullYear());
    		month.set(new_date.getMonth());
    		day.set(new_date.getDate());
    	}

    	function deacrement_date() {
    		let new_date = new Date(year_number, month_number, day_number);
    		new_date.setDate(new_date.getDate() - 1);
    		year.set(new_date.getFullYear());
    		month.set(new_date.getMonth());
    		day.set(new_date.getDate());
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ActionsDate> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		year,
    		month,
    		day,
    		year_number,
    		month_number,
    		day_number,
    		month_string,
    		day_string,
    		increment_date,
    		deacrement_date
    	});

    	$$self.$inject_state = $$props => {
    		if ('year_number' in $$props) $$invalidate(0, year_number = $$props.year_number);
    		if ('month_number' in $$props) month_number = $$props.month_number;
    		if ('day_number' in $$props) day_number = $$props.day_number;
    		if ('month_string' in $$props) $$invalidate(1, month_string = $$props.month_string);
    		if ('day_string' in $$props) $$invalidate(2, day_string = $$props.day_string);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [year_number, month_string, day_string, increment_date, deacrement_date];
    }

    class ActionsDate extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ActionsDate",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/ActionsContainers.svelte generated by Svelte v3.55.1 */

    const { Error: Error_1, console: console_1 } = globals;
    const file$1 = "src/components/ActionsContainers.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i].idd;
    	child_ctx[3] = list[i].name;
    	child_ctx[4] = list[i].actions_list;
    	return child_ctx;
    }

    // (1:0) <script> import ActionBox from "./ActionBox.svelte"; import ActionsCategoryBox from "./ActionsCategoryBox.svelte"; import ActionsDate from "./ActionsDate.svelte"; import { year, month, day }
    function create_catch_block(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <script> import ActionBox from \\\"./ActionBox.svelte\\\"; import ActionsCategoryBox from \\\"./ActionsCategoryBox.svelte\\\"; import ActionsDate from \\\"./ActionsDate.svelte\\\"; import { year, month, day }",
    		ctx
    	});

    	return block;
    }

    // (28:41)          {#each categories_list as {idd, name, actions_list}
    function create_then_block(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*categories_list*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*promise*/ 1) {
    				each_value = /*categories_list*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(28:41)          {#each categories_list as {idd, name, actions_list}",
    		ctx
    	});

    	return block;
    }

    // (29:8) {#each categories_list as {idd, name, actions_list}
    function create_each_block(ctx) {
    	let actionscategorybox;
    	let current;

    	actionscategorybox = new ActionsCategoryBox({
    			props: {
    				category_name: /*name*/ ctx[3],
    				actions_list: /*actions_list*/ ctx[4]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(actionscategorybox.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(actionscategorybox, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(actionscategorybox.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(actionscategorybox.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(actionscategorybox, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(29:8) {#each categories_list as {idd, name, actions_list}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script> import ActionBox from "./ActionBox.svelte"; import ActionsCategoryBox from "./ActionsCategoryBox.svelte"; import ActionsDate from "./ActionsDate.svelte"; import { year, month, day }
    function create_pending_block(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(1:0) <script> import ActionBox from \\\"./ActionBox.svelte\\\"; import ActionsCategoryBox from \\\"./ActionsCategoryBox.svelte\\\"; import ActionsDate from \\\"./ActionsDate.svelte\\\"; import { year, month, day }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let actionsdate;
    	let t;
    	let current;
    	actionsdate = new ActionsDate({ $$inline: true });

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 1,
    		blocks: [,,,]
    	};

    	handle_promise(/*promise*/ ctx[0], info);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(actionsdate.$$.fragment);
    			t = space();
    			info.block.c();
    			attr_dev(div, "class", "actionsContainer");
    			add_location(div, file$1, 23, 0, 492);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(actionsdate, div, null);
    			append_dev(div, t);
    			info.block.m(div, info.anchor = null);
    			info.mount = () => div;
    			info.anchor = null;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			update_await_block_branch(info, ctx, dirty);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(actionsdate.$$.fragment, local);
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(actionsdate.$$.fragment, local);

    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(actionsdate);
    			info.block.d();
    			info.token = null;
    			info = null;
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

    async function get_actions_list() {
    	const response = await fetch('/actions_list');

    	if (response.ok) {
    		return response.json();
    	} else {
    		throw new Error('Error with comunication.');
    	}
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ActionsContainers', slots, []);
    	console.log(year);
    	let promise = get_actions_list();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<ActionsContainers> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		ActionBox,
    		ActionsCategoryBox,
    		ActionsDate,
    		year,
    		month,
    		day,
    		promise,
    		get_actions_list
    	});

    	$$self.$inject_state = $$props => {
    		if ('promise' in $$props) $$invalidate(0, promise = $$props.promise);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [promise];
    }

    class ActionsContainers extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ActionsContainers",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.55.1 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let header1;
    	let header0;
    	let t;
    	let main;
    	let actionscontainers;
    	let current;
    	header0 = new Header({ $$inline: true });
    	actionscontainers = new ActionsContainers({ $$inline: true });

    	const block = {
    		c: function create() {
    			header1 = element("header");
    			create_component(header0.$$.fragment);
    			t = space();
    			main = element("main");
    			create_component(actionscontainers.$$.fragment);
    			add_location(header1, file, 5, 0, 142);
    			attr_dev(main, "class", "svelte-pu47pp");
    			add_location(main, file, 8, 0, 172);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header1, anchor);
    			mount_component(header0, header1, null);
    			insert_dev(target, t, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(actionscontainers, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header0.$$.fragment, local);
    			transition_in(actionscontainers.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header0.$$.fragment, local);
    			transition_out(actionscontainers.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header1);
    			destroy_component(header0);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(main);
    			destroy_component(actionscontainers);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Header, ActionsContainers });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
