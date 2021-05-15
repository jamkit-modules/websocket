var module = (function() {
    const webjs = require("webjs-helper");

    var _id = "", _dir_path = "", _handlers = [];
    var _web_prefix = "", _sockets = {};
    var _web_loaded = false;

    function _create_socket(sockid) {
        return (function() {
            var _handlers = {};

            return {
                send: function(data) {
                    return new Promise(function(resolve, reject) {
                        webjs.call("sendData", [ sockid, data ])
                            .then(function() {
                                resolve();
                            })
                            .catch(function(error) {
                                reject(error);
                            });
                    });
                },

                on: function(event, handler) {
                    _handlers[event] = handler;
                },

                _handle_event: function(event, data) {
                    if (event in _handlers) {
                        _handlers[event](data);
                    }
                }
            }
        })();
    }

    function _on_web_loaded(data) {
        if (data["url"].startsWith("http://localhost")) {
            webjs.import(_dir_path + "/websocket.js");

            _handlers.forEach(function(handler) {
                handler();
            });

            _web_loaded = true, _handlers = [];
        }
    }

    function _on_socket_event(data) {
        var sockid = data["socket"] || 0;

        if (sockid in _sockets) {
            if ("data" in data) {
                _sockets[sockid]._handle_event(data["event"], JSON.parse(data["data"]));
            } else {
                _sockets[sockid]._handle_event(data["event"]);
            }
        }
    }

    return {
        initialize: function(id) {
            var web_prefix = id.replace(".", "_");
            var dir_path = this.__ENV__["dir-path"];

            global[web_prefix + "__on_web_loaded"] = function(data) {
                _on_web_loaded(data);
            }
            global[web_prefix + "__on_socket_event"] = function(data) {
                _on_socket_event(data);
            }

            webjs.initialize(id + ".web", "__$_bridge");
            view.object(id).action("load", { 
                "filename": dir_path + "/web.sbml",
                "dir-path": dir_path,
                "web-id": id, 
                "web-prefix": web_prefix
            });

            _id = id, _dir_path = dir_path;
            _web_prefix = web_prefix;

            return this;
        },
        
        create: function(url, protocols) {
            return new Promise(function(resolve, reject) {
                var handler = function() {
                    webjs.call("createSocket", [ _web_prefix, url, protocols ])
                        .then(function(sockid) {
                            var socket = _create_socket(sockid);

                            _sockets[sockid] = socket;

                            resolve(socket);
                        })
                        .catch(function(error) {
                            reject(error);
                        });
                }

                _web_loaded ? handler() : _handlers.push(handler);
            });
        },

        destroy: function(socket) {
            return new Promise(function(resolve, reject) {
                var handler = function() {
                    
                }

                _web_loaded ? handler() : _handlers.push(handler);
            });
        },
    }
})();

__MODULE__ = module;
