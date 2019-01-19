/**
 * Copyright (C) 2012-2013 Michał Czapracki
 *
 * All rights reserved.
 *
 */
(function(c, io) {
    if (!io)
        throw new Error("Socket.io is needed for all this to work!");

    var q = false,
        dm = function() {},
        l = console || {log: dm, error: dm},
        // a simple trace
        tr = function(a) { q || l.log.apply(l, arguments); return a; },
        // an async trace
        atr = function(c) {

            if (q) return c;

            var ex = Array.prototype.slice(arguments, 1);
            return function() {
                l.log.apply(l, Array.prototype.concat(arguments, ex));
                c.apply(null, arguments);
            }
        },
        // relays an event to socket
        rs = function(ev) {
            return function() {
                var args = [ev];
                this.socket.emit.apply(this.socket,
                    args.concat.apply(args,
                        Array.prototype.slice.call(arguments, 1)
                    )
                );
                return this;
            };
        },
        // relays a socket event to function
        rf = function(o, ev) {
            o.socket.on(ev, o[ev].bind(o));
        },
        // relays socket event to object event
        re = function(o, ev) {
            o.socket.on(ev, o.emit.bind(o, ev));
        },
        // relays a discrete control
        rcd = function(ctrl) {
            return dm;
        },
        // relays a continous control
        rcc = function(ctrl) {
            return dm;
        },
        // creates a digital head control object
        hdct = function(o, n) {
            //o.control(n);
            tr('creating control', n);
            return {
                pos: o.ctrls++,
                down: function(c) { o.on(tr('c:' + n + ':dn', 'listening'), c); return this; },
                up: function(c) { o.on(tr('c:' + n + ':up', 'listening'), c); return this; },
                out: function() { return o; }
            };
        },
        // creates a digital tails control object
        tdct = function(o, n) {
            return {
                down: function() { o.socket.emit('ctrl', 'c:' + n + ':dn'); },
                up: function() { o.socket.emit('ctrl', 'c:' + n + ':up'); },
                out: function() { return o; }
            };
        };



    c.heads = function(addr) {
        return new Heads()
            .init(io.connect('/heads'), addr);
    };
    c.tails = function(uuid) {
        return new Tails(uuid)
            .init(io.connect('/tails'));
    };

    var getAddr = function(url) {
        var img = document.createElement('img');
        img.src = url;
        url = img.src;
        img.src = null;
        return url;
    }

    var Heads = function() {
        var Heads = function() {
            this.socket = null;
            this.capabilites = null;
            this.controls = null;
            this.ctrls = 0;
        };

        var h = Heads, hp = h.prototype = new EventEmitter();

        hp.init = function(socket, tailHref) {
            this.socket = socket;
            this.socket.emit('href', getAddr(tailHref));
            re(this, 'img');
            re(this, 'link');
            rf(this, 'conn');
            rf(this, 'sensors');
            rf(this, 'timeout');
            rf(this, 'ctrl');

            return this;
        };

        // creates/fetches a control and returns its object
        hp.control = function(name) {
            this.controls = this.controls || {};
            return this.controls[name] = this.controls[name] || hdct(this, name);
        };

        hp.sensors = function(data) {
        };

        hp.ctrl = function(name) {
            l.log('control', name);
            this.emit(name);
        };

        hp.timeout = function() {
            tr('timeout', arguments);
        };

        hp.conn = function() {
            var ctrl = {};
            for (var id in this.controls)
                ctrl[id] = this.controls[id].pos;
            this.socket.emit('controls', tr(ctrl, 'emitting controls'));
            this.emit('conn');
        };

        hp.error = rs('error');
        hp.log = rs('log');

        return h;
    }();

    var Tails = function() {
        var Tails = function(uuid) {
            this.socket = null;
            this.capabilites = null;
            this._controls = null;
            this.uuid = uuid || '';
        };
        var t = Tails, tp = t.prototype = new EventEmitter();

        tp.init = function(socket) {
            this.socket = socket;
            rf(this, 'connect');
            rf(this, 'error');
            rf(this, 'controls');

            return this;
        };

        tp.connect = function() {
            this.socket.emit('tails', this.uuid);
            return this;
        };

        tp.error = function(code) {
            l.error(code);
        };

        tp.controls = function(ctrl) {
            if (this._controls)
                throw new Error('Controls already set!');

            this._controls = {};
            for (var id in ctrl)
                this._controls[id] = tr(tdct(this, id), 'added control');

            this.emit('controls', this._controls);
        };

        tp.sensor = function(name, probe) {

        };

        tp.get = function(callback) {
            if (this._controls) {
                return callback(this._controls);
            }
            this.on('controls', callback);
            return this;
        };

        return t;

     }();

    return c;

}(window.cio = {}, window.io));