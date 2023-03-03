
// Avoid `console` errors in browsers that lack a console.
/*
(function() {
    var method;
    var noop = function () {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
}());
*/


function WebLog(text, cb) {
    return V2kFunction('GET', 'log', text, cb);
}

function Log(text) {
/*
    try {
        if(console != undefined && console != null)
    	    console.log(new Date().toISOString().replace('T', ' ') + ': ' + text);
	    if(V2kHost != null && V2kHost.length > 0)
    	    return WebLog(text);
    } catch (err) {
        // ignore error
    }
*/
}

function get_number(input) {
    try {
        return input.match(/[0-9]+/g);
    } catch (err) {
        // ignore error
    }
}

function V2kFunction(method, func, args, body, cb) {
    try {
		if(V2kHost == null) {
/*
			try {
				if(console != undefined && console != null)
					console.log('No V2kHost');
			} catch (err) {
				// ignore error
			}
*/
			return;
		}
		var xhr = new XMLHttpRequest();
        var ts = 'ts=' + ((new Date()).getTime());
        if (args == null || args.length <= 0)
            args = ts;
        else
            args += '&' + ts;

		var url = 'http://' + V2kHost + '/' + func + ((args != null && args.length > 0) ? ('?' + args) : '');
		xhr.open(method, url);
		xhr.setRequestHeader('Content-Type', 'text/plain');
		xhr.onreadystatechange = function () {
			if (xhr.readyState === XMLHttpRequest.DONE && xhr.status == 200) {
				if (cb)
					cb(null, xhr.response);
			}
		};
		xhr.send(body);
    } catch (err) {
        Log(method+func+err);
    }
}


function Sleeper(milli) {
	var start = new Date().getTime();
	var timer = true;
	while (timer) {
		if ((new Date().getTime() - start)> milli)
			timer = false;
	}
}
