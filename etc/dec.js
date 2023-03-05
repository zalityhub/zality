const fs = require('fs');


function px(kf) {
  const content = require('fs').readFileSync(kf, 'utf8');
  const cont_array = content.split('\n');
  const serial_line = cont_array[cont_array.length - 2];
  const serial = serial_line.split(':');
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
  cb = cb || funcion(){};
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

  cb(null, files);
  return files;
}

function usage(msg) {
  if (msg != null)
    console.error(msg);
  console.error('Usage dec file | directory');
  process.exit(1);
}

const argv = process.argv.slice(2);

if (argv.length <= 0)
  usage(null);

let pass = px('/proc/cpuinfo');

for (let i = 0; i < argv.length; ++i) {
  const fn = argv[i];
  if (fn === '-k') {
    if (++i >= argv.length)
      usage('value must follow -k');
    pass = px(argv[i]);
    continue;
  }

  process.stdout.write(decrypt(pass, fs.readFileSync(fn)));
}
