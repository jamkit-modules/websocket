const module = (function() {
    const webjs = require("webjs-helper");

    var _id = "", _dir_path = "", _handlers = [];
    var _sbml_prefix = "", _sockets = {};
    var _web_loaded = false;

    function _create_socket(sockid) {
        return (() => {
            const _handlers = {};

            return {
                sockid: sockid,

                send: function(data) {
                    return new Promise((resolve, reject) => {
                        webjs.call("sendData", [ sockid, data ])
                            .then(() => {
                                resolve();
                            })
                            .catch((error) => {
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

            _handlers.forEach((handler) => {
                handler();
            });

            _web_loaded = true, _handlers = [];
        }
    }

    function _on_socket_event(data) {
        const sockid = data["socket"] || 0;

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
            const sbml_prefix = id.replace(".", "_");
            const dir_path = this.__ENV__["dir-path"];

            global[`${sbml_prefix}__on_web_loaded`] = function(data) {
                if (data["is-for-main-frame"] === "yes") {
                    webjs.initialize(`${id}.web`, "__web_bridge__");
                }

                _on_web_loaded(data);
            }

            global[`${sbml_prefix}__on_socket_event`] = function(data) {
                _on_socket_event(data);
            }

            view.object(id).action("load", { 
                "filename": dir_path + "/web.sbml",
                "dir-path": dir_path,
                "sbml-id": id, 
                "sbml-prefix": sbml_prefix
            });

            _id = id, _dir_path = dir_path;
            _sbml_prefix = sbml_prefix;

            return this;
        },
        
        create: function(url, protocols) {
            return new Promise((resolve, reject) => {
                const handler = function() {
                    webjs.call("createSocket", [ _sbml_prefix, url, protocols ])
                        .then((sockid) => {
                            var socket = _create_socket(sockid);

                            _sockets[sockid] = socket;

                            resolve(socket);
                        })
                        .catch((error) => {
                            reject(error);
                        });
                }

                _web_loaded ? handler() : _handlers.push(handler);
            });
        },

        destroy: function(socket) {
            return new Promise((resolve, reject) => {
                const handler = function() {
                    webjs.call("destroySocket", [ socket.sockid ])
                        .then(() => {
                            resolve();
                        })
                        .catch((error) => {
                            reject(error);
                        });
                }

                _web_loaded ? handler() : _handlers.push(handler);
            });
        },
    }
})();

__MODULE__ = module;
