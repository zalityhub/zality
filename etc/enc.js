var fs = require('fs');


function px(kf){
	var content = require('fs').readFileSync(kf, 'utf8');
	var cont_array = content.split("\n");
	var serial_line = cont_array[cont_array.length-2];
	var serial = serial_line.split(":");
	return serial[1].slice(1).toString();
}


var crypto = require('crypto'),
	algorithm = 'aes-256-ctr';

function encrypt(password, buffer){
	//console.log('pass='+password);
	var cipher = crypto.createCipher(algorithm,password)
	var crypted = Buffer.concat([cipher.update(buffer),cipher.final()]);
	return crypted;
}

function decrypt(password, buffer){
	//console.log('pass='+password);
	var decipher = crypto.createDecipher(algorithm,password)
	var dec = Buffer.concat([decipher.update(buffer) , decipher.final()]);
	return dec;
}


function file_stat(fn) {
    if (!fn)
        return null;

    try {
        lstat = fs.lstatSync(fn);
    } catch (e) {
        lstat = null;
    }
    return lstat;
}


function get_files(dir, exp, cb) {
    var files = [];
    var list = fs.readdirSync(dir);
    for (var i in list) {
        var fn = list[i];
        fn = (dir + '/' + fn).toString();
        var lstat = file_stat(fn);
        if (lstat == null)
            continue;		// no type

        if (lstat.isFile() &&
            (exp == null || fn.match(exp))) {
            files.push(fn);
        }
    }

    if (cb)
        cb(null, files);
    return files;
}

function usage(msg) {
	if(msg != null)
		console.error(msg);
    console.error('Usage enc file | directory');
	process.exit(1);
}


var pass = px('/proc/cpuinfo');
var argv = process.argv.slice(2);

if(argv.length <= 0)
	usage(null);

for(var i = 0; i < argv.length; ++i) {
	var fn = argv[i];
	if(fn == '-k') {
		if(++i >= argv.length)
			usage('value must follow -k');
		pass = px(argv[i]);
		continue;
	}

	var astat = file_stat(fn);
	if (!astat)
		usage("Can't stat " + fn);

	if (astat.isDirectory()) {
		var files = get_files(fn, '\..*s$', function (err, files) {
			for (var i in files) {
				var fn = files[i].toString();
				var bn = fn.substr(0, fn.lastIndexOf('.'));
				var ext = fn.substr(fn.lastIndexOf('.') + 1);
				fs.writeFileSync(bn + ((ext == 'hbs') ? '.hbe' : '.jse'), encrypt(pass, fs.readFileSync(fn)));
			}
		});
	} else if (astat.isFile()) {
		var bn = fn.substr(0, fn.lastIndexOf('.'));
		var ext = fn.substr(fn.lastIndexOf('.') + 1);
		if(fn.lastIndexOf('.') < 0 ) {
			bn = fn;
			ext = '';
		}

		fs.writeFileSync(bn + ((ext == 'hbs') ? '.hbe' : '.jse'), encrypt(pass, new Buffer(fs.readFileSync(fn))));
	}
}
