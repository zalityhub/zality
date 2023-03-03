const fs = require('fs');


function px(kf) {
  const content = require('fs').readFileSync(kf, 'utf8');
  const cont_array = content.split("\n");
  const serial_line = cont_array[cont_array.length - 2];
  const serial = serial_line.split(":");
  return serial[1].slice(1).toString();
}


const crypto = require('crypto'),
  algorithm = 'aes-256-ctr';

function encrypt(password, buffer) {
  //console.log('pass='+password);
  const cipher = crypto.createCipher(algorithm, password)
  const crypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return crypted;
}

function decrypt(password, buffer) {
  //console.log('pass='+password);
  const decipher = crypto.createDecipher(algorithm, password)
  const dec = Buffer.concat([decipher.update(buffer), decipher.final()]);
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
  const files = [];
  const list = fs.readdirSync(dir);
  for (const i in list) {
    let fn = list[i];
    fn = (dir + '/' + fn).toString();
    const lstat = file_stat(fn);
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
  if (msg != null)
    console.error(msg);
  console.error('Usage enc file | directory');
  process.exit(1);
}


let pass = px('/proc/cpuinfo');
const argv = process.argv.slice(2);

if (argv.length <= 0)
  usage(null);

for (let i = 0; i < argv.length; ++i) {
  const fn = argv[i];
  if (fn == '-k') {
    if (++i >= argv.length)
      usage('value must follow -k');
    pass = px(argv[i]);
    continue;
  }

  const astat = file_stat(fn);
  if (!astat)
    usage("Can't stat " + fn);

  if (astat.isDirectory()) {
    const files = get_files(fn, '\..*s$', function (err, files) {
      for (const i in files) {
        const fn = files[i].toString();
        const bn = fn.substr(0, fn.lastIndexOf('.'));
        const ext = fn.substr(fn.lastIndexOf('.') + 1);
        fs.writeFileSync(bn + ((ext == 'hbs') ? '.hbe' : '.jse'), encrypt(pass, fs.readFileSync(fn)));
      }
    });
  } else if (astat.isFile()) {
    let bn = fn.substr(0, fn.lastIndexOf('.'));
    let ext = fn.substr(fn.lastIndexOf('.') + 1);
    if (fn.lastIndexOf('.') < 0) {
      bn = fn;
      ext = '';
    }

    fs.writeFileSync(bn + ((ext == 'hbs') ? '.hbe' : '.jse'), encrypt(pass, new Buffer(fs.readFileSync(fn))));
  }
}
