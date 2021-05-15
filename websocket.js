const _socketMap = {}

function createSocket(owner, url, protocols, onResult, onError) {
    var socket = new WebSocket(url, protocols);
    var sockid = (Math.random() * 10000).toFixed(0);

    socket.binaryType = "arraybuffer";

    socket.onopen = function(event) {
        if (sockid in _socketMap) {
            _notifyEvent(owner, "open", sockid);
        }
    }

    socket.onmessage = function(event) {
        if (sockid in _socketMap) {
            _notifyEvent(owner, "message", sockid, Array.from(new Uint8Array(event.data)));
        }
    }
    
    socket.onclose = function(event) {
        if (sockid in _socketMap) {
            _notifyEvent(owner, "close", sockid);
        }

        delete _socketMap[sockid];
    }
    
    socket.onerror = function() {
        if (sockid in _socketMap) {
            _notifyEvent(owner, "error", sockid);
        }
    }
    
    _socketMap[sockid] = socket;

    onResult(sockid);
}

function destroySocket(sockid, onResult, onError) {
    if (sockid in _socketMap) {
        var socket = _socketMap[sockid];

        socket.close();

        delete _socketMap[sockid];

        onResult();
    } else {
        onError({ code: 404 });
    }
}

function sendData(sockid, data, onResult, onError) {
    if (sockid in _socketMap) {
        var socket = _socketMap[sockid];

        socket.send(data);

        onResult();
    } else {
        onError({ code: 404 });
    }
}

function _notifyEvent(owner, event, sockid, data) {
    __$_bridge.postMessage(JSON.stringify({
        "script": owner + "__on_socket_event",
        "socket": sockid,
        "event": event,
        "data": JSON.stringify(data)
    }));
}
