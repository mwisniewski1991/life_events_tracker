
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
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
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.55.0' }, detail), { bubbles: true }));
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

    /* src/components/Header.svelte generated by Svelte v3.55.0 */

    const file$4 = "src/components/Header.svelte";

    function create_fragment$4(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Life Tracker";
    			attr_dev(h1, "class", "display-1 svelte-669z50");
    			add_location(h1, file$4, 4, 0, 21);
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
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
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
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/components/ActionBox.svelte generated by Svelte v3.55.0 */

    const { console: console_1 } = globals;
    const file$3 = "src/components/ActionBox.svelte";

    function create_fragment$3(ctx) {
    	let div1;
    	let div0;
    	let h5;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			t0 = text(/*action_name*/ ctx[0]);
    			t1 = space();
    			t2 = text(/*action_status*/ ctx[2]);
    			t3 = space();
    			button = element("button");
    			button.textContent = "Add action";
    			attr_dev(h5, "class", "card-title");
    			add_location(h5, file$3, 36, 12, 822);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-outline-success svelte-7k4qhb");
    			add_location(button, file$3, 37, 8, 888);
    			attr_dev(div0, "class", "cakrd-body");
    			add_location(div0, file$3, 35, 4, 785);
    			attr_dev(div1, "class", "card svelte-7k4qhb");
    			add_location(div1, file$3, 34, 0, 762);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h5);
    			append_dev(h5, t0);
    			append_dev(h5, t1);
    			append_dev(h5, t2);
    			append_dev(div0, t3);
    			append_dev(div0, button);

    			if (!mounted) {
    				dispose = listen_dev(
    					button,
    					"click",
    					function () {
    						if (is_function(/*post_action*/ ctx[3](/*action_id*/ ctx[1]))) /*post_action*/ ctx[3](/*action_id*/ ctx[1]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			if (dirty & /*action_name*/ 1) set_data_dev(t0, /*action_name*/ ctx[0]);
    			if (dirty & /*action_status*/ 4) set_data_dev(t2, /*action_status*/ ctx[2]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
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
    	validate_slots('ActionBox', slots, []);
    	let { action_name } = $$props;
    	let { action_id } = $$props;
    	let action_status = '';

    	async function post_action(action_idd) {
    		const response = await fetch(`/action_post?action_idd=${action_idd}`, { method: 'POST' });

    		if (response.ok) {
    			const respond = await response.json();

    			if (respond['actions_events_existed'] == true) {
    				$$invalidate(2, action_status = '- action already posted today');
    				console.log(respond);
    			}

    			if (respond['posted'] == true) {
    				$$invalidate(2, action_status = '- POSTED');
    				console.log(respond);
    			}
    		} else {
    			$$invalidate(2, action_status = 'error during posting');
    		}
    	}

    	$$self.$$.on_mount.push(function () {
    		if (action_name === undefined && !('action_name' in $$props || $$self.$$.bound[$$self.$$.props['action_name']])) {
    			console_1.warn("<ActionBox> was created without expected prop 'action_name'");
    		}

    		if (action_id === undefined && !('action_id' in $$props || $$self.$$.bound[$$self.$$.props['action_id']])) {
    			console_1.warn("<ActionBox> was created without expected prop 'action_id'");
    		}
    	});

    	const writable_props = ['action_name', 'action_id'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<ActionBox> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('action_name' in $$props) $$invalidate(0, action_name = $$props.action_name);
    		if ('action_id' in $$props) $$invalidate(1, action_id = $$props.action_id);
    	};

    	$$self.$capture_state = () => ({
    		action_name,
    		action_id,
    		action_status,
    		post_action
    	});

    	$$self.$inject_state = $$props => {
    		if ('action_name' in $$props) $$invalidate(0, action_name = $$props.action_name);
    		if ('action_id' in $$props) $$invalidate(1, action_id = $$props.action_id);
    		if ('action_status' in $$props) $$invalidate(2, action_status = $$props.action_status);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [action_name, action_id, action_status, post_action];
    }

    class ActionBox extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { action_name: 0, action_id: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ActionBox",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get action_name() {
    		throw new Error("<ActionBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set action_name(value) {
    		throw new Error("<ActionBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get action_id() {
    		throw new Error("<ActionBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set action_id(value) {
    		throw new Error("<ActionBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/ActionsCategoryBox.svelte generated by Svelte v3.55.0 */
    const file$2 = "src/components/ActionsCategoryBox.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i].action_idd;
    	child_ctx[3] = list[i].action_name;
    	return child_ctx;
    }

    // (16:8) {#each actions_list as {action_idd, action_name}}
    function create_each_block$1(ctx) {
    	let actionbox;
    	let current;

    	actionbox = new ActionBox({
    			props: {
    				action_id: /*action_idd*/ ctx[2],
    				action_name: /*action_name*/ ctx[3]
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
    			if (dirty & /*actions_list*/ 2) actionbox_changes.action_id = /*action_idd*/ ctx[2];
    			if (dirty & /*actions_list*/ 2) actionbox_changes.action_name = /*action_name*/ ctx[3];
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
    		source: "(16:8) {#each actions_list as {action_idd, action_name}}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
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

    			attr_dev(h3, "class", "display-5 svelte-10g0r0n");
    			add_location(h3, file$2, 11, 8, 207);
    			attr_dev(div0, "class", "row");
    			add_location(div0, file$2, 10, 4, 181);
    			attr_dev(div1, "class", "row");
    			add_location(div1, file$2, 14, 4, 266);
    			attr_dev(div2, "class", "container m-3 actionsCategoryBox svelte-10g0r0n");
    			add_location(div2, file$2, 8, 0, 129);
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
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
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

    	$$self.$capture_state = () => ({ category_name, actions_list, ActionBox });

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
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { category_name: 0, actions_list: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ActionsCategoryBox",
    			options,
    			id: create_fragment$2.name
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

    /* src/components/ActionsContainers.svelte generated by Svelte v3.55.0 */

    const { Error: Error_1 } = globals;
    const file$1 = "src/components/ActionsContainers.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i].idd;
    	child_ctx[4] = list[i].name;
    	child_ctx[5] = list[i].actions_list;
    	return child_ctx;
    }

    // (1:0) <script>  const category_list = [     {id:'work', name: 'Work', action_list: [         { action_id: 'office', action_name:'Office', posted_today: true}
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
    		source: "(1:0) <script>  const category_list = [     {id:'work', name: 'Work', action_list: [         { action_id: 'office', action_name:'Office', posted_today: true}",
    		ctx
    	});

    	return block;
    }

    // (61:41)          {#each categories_list as {idd, name, actions_list}
    function create_then_block(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*categories_list*/ ctx[2];
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
    				each_value = /*categories_list*/ ctx[2];
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
    		source: "(61:41)          {#each categories_list as {idd, name, actions_list}",
    		ctx
    	});

    	return block;
    }

    // (62:8) {#each categories_list as {idd, name, actions_list}
    function create_each_block(ctx) {
    	let actionscategorybox;
    	let current;

    	actionscategorybox = new ActionsCategoryBox({
    			props: {
    				category_name: /*name*/ ctx[4],
    				actions_list: /*actions_list*/ ctx[5]
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
    		source: "(62:8) {#each categories_list as {idd, name, actions_list}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script>  const category_list = [     {id:'work', name: 'Work', action_list: [         { action_id: 'office', action_name:'Office', posted_today: true}
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
    		source: "(1:0) <script>  const category_list = [     {id:'work', name: 'Work', action_list: [         { action_id: 'office', action_name:'Office', posted_today: true}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 2,
    		blocks: [,,,]
    	};

    	handle_promise(/*promise*/ ctx[0], info);

    	const block = {
    		c: function create() {
    			div = element("div");
    			info.block.c();
    			attr_dev(div, "class", "actionContainer svelte-ttn5ps");
    			add_location(div, file$1, 58, 0, 2468);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
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
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
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

    	const category_list = [
    		{
    			id: 'work',
    			name: 'Work',
    			action_list: [
    				{
    					action_id: 'office',
    					action_name: 'Office',
    					posted_today: true
    				},
    				{
    					action_id: 'home',
    					action_name: 'Home office',
    					posted_today: false
    				}
    			]
    		},
    		{
    			id: 'social',
    			name: 'Social',
    			action_list: [
    				{
    					action_id: 'visit',
    					action_name: 'Made visit',
    					posted_today: false
    				},
    				{
    					action_id: 'vistors',
    					action_name: 'Have visitors',
    					posted_today: false
    				}
    			]
    		},
    		{
    			id: 'dinner',
    			name: 'Dinner',
    			action_list: [
    				{
    					action_id: 'homemade',
    					action_name: 'Homemade',
    					posted_today: false
    				},
    				{
    					action_id: 'ordered',
    					action_name: 'Ordered',
    					posted_today: false
    				},
    				{
    					action_id: 'restaurant',
    					action_name: 'Restaurant',
    					posted_today: false
    				}
    			]
    		},
    		{
    			id: 'drinks',
    			name: 'Drinks',
    			action_list: [
    				{
    					action_id: 'tea',
    					action_name: 'Tea',
    					posted_today: false
    				},
    				{
    					action_id: 'coffee',
    					action_name: 'Coffee',
    					posted_today: false
    				},
    				{
    					action_id: 'alcohol',
    					action_name: 'Alcohol',
    					posted_today: false
    				}
    			]
    		},
    		{
    			id: 'health_fitness',
    			name: 'Health and Fitness',
    			action_list: [
    				{
    					action_id: 'bike',
    					action_name: 'Bike',
    					posted_today: false
    				},
    				{
    					action_id: 'gym',
    					action_name: 'Gym',
    					posted_today: false
    				},
    				{
    					action_id: 'home_exercises',
    					action_name: 'Home exercises',
    					posted_today: false
    				},
    				{
    					action_id: 'hike',
    					action_name: 'Hike',
    					posted_today: false
    				},
    				{
    					action_id: 'doctors',
    					action_name: 'Doctors',
    					posted_today: false
    				}
    			]
    		},
    		{
    			id: 'bathroom',
    			name: 'Bath',
    			action_list: [
    				{
    					action_id: 'shower',
    					action_name: 'Shower',
    					posted_today: false
    				},
    				{
    					action_id: 'bath',
    					action_name: 'Bath',
    					posted_today: false
    				},
    				{
    					action_id: 'poop',
    					action_name: 'Poop',
    					posted_today: false
    				}
    			]
    		},
    		{
    			id: 'mw_dev',
    			name: 'MW Developer',
    			action_list: [
    				{
    					action_id: 'python',
    					action_name: 'Python',
    					posted_today: false
    				},
    				{
    					action_id: 'javascript',
    					action_name: 'Javascript',
    					posted_today: false
    				},
    				{
    					action_id: 'react',
    					action_name: 'React',
    					posted_today: false
    				},
    				{
    					action_id: 'iot',
    					action_name: 'Internet of Things',
    					posted_today: false
    				}
    			]
    		}
    	];

    	let promise = get_actions_list();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ActionsContainers> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		category_list,
    		ActionsCategoryBox,
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

    /* src/App.svelte generated by Svelte v3.55.0 */
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
    			attr_dev(main, "class", "svelte-1c00p3a");
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
