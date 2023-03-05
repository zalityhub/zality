nx = exports;
nx.platform = require('os').platform();

const process = require('process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const stringify = require('json-stringify-safe');


// String Prototypes
String.prototype.indexOfNotAlphaNumeric = function () {
  for (let i = 0, ilen = this.length; i < ilen; i++) {
    const ch = this.charAt(i);
    if (!(ch >= '0' && ch <= '9') && // numeric (0-9)
      !(ch >= 'A' && ch <= 'Z') && // upper alpha (A-Z)
      !(ch >= 'a' && ch <= 'z')) { // lower alpha (a-z)
      return i;
    }
  }
  return -1;		// is all alphanumeric
}

String.prototype.isAllDigits = function () {
  for (let c of this) {
    if (!((c >= '0' && c <= '9')))
      return false;
  }
  return true;
}

String.prototype.isAllUpper = function () {
  for (let c of this) {
    if (!((c >= 'A' && c <= 'Z')))
      return false;
  }
  return true;
}

String.prototype.isAllAlpha = function () {
  for (let i = 0; i < this.length; ++i) {
    chr = this.charAt(i).toLowerCase();
    if (chr < 'a' || chr > 'z')
      return false;
  }
  return true;
};

String.prototype.isAllAlphaNumeric = function () {
  return (this.indexOfNotAlphaNumeric < 0) ? true : false;
};

String.prototype.isNumeric = function () {
  return (!isNaN(parseFloat(this)) && isFinite(this));
};

String.prototype.allTrim = String.prototype.allTrim ||
  function () {
    return this.replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/, '').trim();
  };

String.prototype.startsWith = function (prefix) {
  return this.indexOf(prefix) == 0;
};

String.prototype.get_number = function () {
  return this.match(/[0-9]+/g);
};

String.prototype.endsWith = function (suffix) {
  return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

String.prototype.replaceAll = function (find, replace) {
  if (replace === undefined)
    replace = '';
  return this.replace(new RegExp(find, 'g'), replace);
};

String.prototype.escapeText = function (text) {
  if (!text) return text;     // when given null, return same
  return '"' + text.replaceAll('"', '""') + '"';
};

String.prototype.strip = function (remove) {
  return this.replace(new RegExp(remove, 'g'), '');
};


// Enum Prototypes
nx.enum = function (vals) {
  this.def = vals;
  this.vals = {};
  this.add(vals);
  return this;
}

nx.enum.prototype.add = function (vals) {
  vals = nx.nullTo(vals, {});
  if (nx.isArray(vals)) {
    // init via array, numbering enums from 1 -> n
    for (let i = 0, ilen = vals.length; i < ilen; ++i) {
      const key = (i + 1).toString();
      this.vals[key] = vals[i];   // add key -> value
      this.vals[vals[i]] = key;   // and value -> key
    }
  } else {
    for (let key in vals) {
      this.vals[key] = vals[key];   // add key -> value
      this.vals[vals[key]] = key;   // and value -> key
    }
  }
}

nx.enum.prototype.contains = function (key_val) {
  if (this.vals.hasOwnProperty(key_val))
    return this.vals[key_val];
  return null;
}

nx.enum.prototype.valueOf = function (key_val) {
  ret = null;
  if ((ret = this.contains(key_val)))
    return ret;
// Neither; return input
  return key_val;
}


nx.isCharDigit = function (c) {
  return c >= '0' && c <= '9';
}


nx.getCpuInfo = function () {
  let content = '';
  try {
    content = fs.readFileSync('/proc/cpuinfo', 'utf8');
  } catch (err) {
    content = '';
  }
  return content;
}


nx.nullTo = function (s, def) {
  if (s === undefined || s === null)
    s = def;
  return s;
};


nx.nullToString = function (s, def) {
  return this.nullTo(s, def).toString();
};


nx.getProcessOption = function (opt) {
  for (let i = 0; i < process.argv.length; ++i) {
    if (process.argv[i] === opt)
      return i;
  }
  return -1;
};

nx.getProcessArg = function (i) {
  if (i >= 0 && i < process.argv.length)
    return process.argv[i];
  return null;
};


// Hash To Array
nx.hashToArray = function (obj) {
  let _ar = [];
  Object.keys(obj).forEach(function (key) {
    const p = obj[key];
    if (p != null)
      _ar.push(obj[key]);
  });
  return _ar;
};


nx.parseJsonFile = function (file) {
  try {
    const text = fs.readFileSync(file).toString();
    return JSON.parse(text);
  } catch (e) {
    nx.logError(e.toString());
    return null;
  }
}

nx.getEnv = function (section, isRequired, file) {
  if (nx.isNull(isRequired))
    isRequired = false;
  if (nx.isNull(file)) {
    if (nx.platform === 'win32')
      file = `c:/cygwin64/home/hbray/etc/env.json`;
    else
      file = `/home/hbray/etc/env.json`;
  }
  const env = nx.parseJsonFile(file);
  if (isRequired && (nx.isNull(env) || ((!nx.isNull(section)) && nx.isNull(env[section]))))
    nx.fatal(`unable to continue without a ${file}.${section}`);
  return nx.isNull(section) ? env : env[section];
}


nx.logger = function (settings) {
  this.set(settings);
}

nx.logger.prototype.set = function (settings) {
  if (nx.isNull(settings))
    settings = {};

  delete settings['stream'];    // remove inapproriate value
// add missing members
  this.settings = {...{lineSpacing: 1, file: '', mask: {}}, ...settings};

  if (this.settings.stream) {
    this.settings.stream.end();
    delete this.settings['stream'];
  }

  if (this.settings.file.length > 0)
    this.settings.stream = fs.createWriteStream(this.settings.file);
}

nx.logger.prototype.setMask = function (mask) {
  this.settings.mask = {...this.settings.mask, ...mask};
  return this.settings.mask;
}

nx.logger.prototype.logInitMask = function (mask) {
  this.settings.mask = mask;
  return this.settings.mask;
}

nx.logger.prototype.logOutput = function (con, text) {
  function out(stream, text, lineSpacing) {
    const eol = Buffer.alloc(lineSpacing).fill('\n');
    stream.write(`${new Date().toISOString().replace('T', ' ')}:${text}${eol}`);
  }

  out(con, text, this.settings.lineSpacing);
  if (this.settings.stream)
    out(this.settings.stream, text, this.settings.lineSpacing);
  return text;
}

nx.logger.prototype.log = function (text) {
  return this.logOutput(process.stdout, util.format.apply(this, arguments));
}

nx.logger.prototype.mLog = function (mask, text) {
  if (nx.isNull(this.settings.mask[mask]) || !this.settings.mask[mask])
    return '';    // mask is off, don't log
  return this.logOutput(process.stdout, util.format.apply(this, arguments));
}

nx.logger.prototype.logError = function (text) {
  return this.logOutput(process.stderr, util.format.apply(this, arguments));
}

nx.logger.prototype.fatal = function (message) {
  this.logError(message);
  throw new Error(this.log(message.toString()));
  process.exit(1);
}

nx.log = function (text) {
  if (nx.isNull(nx._log))
    nx._log = new nx.logger();
  return nx._log.log(text);
}

nx.mLog = function (mask, text) {
  if (nx.isNull(nx._log))
    nx._log = new nx.logger();
  return nx._log.mLog(text);
}

nx.logError = function (text) {
  if (nx.isNull(nx._log))
    nx._log = new nx.logger();
  return nx._log.logError(text);
}

nx.fatal = function (text) {
  if (nx.isNull(nx._log))
    nx._log = new nx.logger();
  return nx._log.fatal(text);
}


nx.doCmd = function (cmd, args) {
  try {
    nx.log(cmd);
    nx.log(args);
    const proc = require('child_process').spawnSync(cmd, args);
    if (proc.error)
      throw proc.error;
    return [proc.status, proc.stdout.toString(), proc.stderr.toString()];
  } catch (err) {
    nx.logError('DoCmd failed ' + err);
    return [-1, '', nx.logError('DoCmd failed ' + err)];
  }
}

/**
 * @return {boolean}
 */
nx.isNull = function (en, required) {
  if (required === undefined || required === null)
    required = false;
  if (en === undefined || en === null) {
    if (!required)
      return true;
    Fatal(stringify(en) + ' must not be null');
  }
  return false;
}

/**
 * @return {boolean}
 */
nx.isObject = function (en, required) {
  if (nx.isNull(required))
    required = false;
  if (!nx.isNull(en) && en.constructor === Object)
    return true;
  if (!required)
    return false;
  Fatal(stringify(en) + ' must be an Object');
}


/**
 * @return {boolean}
 */
nx.isArray = function (en, required) {
  if (nx.isNull(required))
    required = false;
  if (en instanceof Array)
    return true;
  if (!required)
    return false;
  Fatal(stringify(en) + ' must be an Array');
}


/**
 * @return {boolean}
 */
nx.isString = function (en, required) {
  if (nx.isNull(required))
    required = false;
  if (typeof (en) === 'string')
    return true;
  if (!required)
    return false;
  Fatal(stringify(en) + ' must be a String');
}

/**
 * @return {boolean}
 */
nx.isFunction = function (it, isRequired) {
  if (nx.isNull(isRequired))
    isRequired = false;

  if (typeof it === 'function')
    return true;
  if (!isRequired)
    return false;
  Fatal(stringify(it) + ' must be a Function');
}

/**
 * @return {boolean}
 */
nx.isTrue = function (it, isRequired) {
  if (nx.isNull(isRequired))
    isRequired = false;

  if (it === undefined && isRequired)
    Fatal(stringify(it) + ' must be Present');

  if (it !== undefined && it)
    return true;
  return false;
}


nx.statSafeSync = function (path) {
  try {
    const stat = fs.statSync(path);
    stat.rpath = path;
    return stat;
  } catch (err) {
    return err;
  }
}


nx.fileExists = function (path) {
  const stat = StatSafeSync(path);
  return !nx.isNull(stat.dev);
}


nx.getBody = function (req, cb) {
  cb = cb || funcion(){};
  try {
    const body = [];
    req.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      req.body = Buffer.concat(body).toString();
      if (req.body.startsWith('{'))
        req.body = JSON.parse(req.body); // convert to a json object
      cb(null, req);
    });
  } catch (err) {
    cb(err);
  }
}


nx.fsIterate = function (dir, cb) {
  cb = cb || funcion(){};
  fs.readdir(dir, function (err, objects) {
    if (err) {
      nx.logError(`Could not list ${objects}`, err);
      process.exit(1);
    }

    objects.forEach(function (object, index) {
      const fpath = path.join(dir, object);

      fs.stat(fpath, function (err, stat) {
        if (err)
          return nx.logError(`Error stating ${fpath}: ${err.toString()}`);
        stat.fpath = fpath;
        cb(null, stat);
      });
    })
  });
}


nx.fsGet = function (dir, exp, recursive) {
  let stats = [];
  let re = new RegExp('.*');    // anything
  if (exp && nx.isString(exp))
    re = new RegExp(exp);
  const ar = fs.readdirSync(dir);
  for (let i = 0, ilen = ar.length; i < ilen; ++i) {
    const fpath = path.join(dir, ar[i]);
    const stat = fs.statSync(fpath);
    stat.fpath = fpath;
    stat.name = ar[i];
    if (recursive && stat.isDirectory())
      stats = stats.concat(FsGet(fpath, recursive));
    else if (re.exec(stat.name))
      stats.push(stat);
  }
  return stats;
}


nx.countObjectProperties = function (obj) {
  return Object.keys(obj).length;
}


nx.getMemoryStats = function () {
  return Object.entries(process.memoryUsage()).reduce((carry, [key, value]) => {
    return `${carry}${key}:${Math.round(value / 1024 / 1024 * 100) / 100}MB;`;
  }, '');
}


nx.garbageCollect = function () {
  try {
    if (global.gc) {
      global.gc();
    }
  } catch (err) {
    nx.logError(`Error: ${err.message}`);
    process.exit();
  }
}


nx.serialize = {};
nx.serialize.start = function (queue, handler) {
  this.queue = queue;
  this.handler = handler;
  this.next();
}
nx.serialize.next = function () {
  if (this.queue.length > 0)
    this.handler(this, this.queue.pop());   // get the next one
}


/*::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::*/
/*::                                                                         :*/
/*::  This routine calculates the distance between two points (given the     :*/
/*::  latitude/longitude of those points). It is being used to calculate     :*/
/*::  the distance between two locations using GeoDataSource (TM) prodducts  :*/
/*::                                                                         :*/
/*::  Definitions:                                                           :*/
/*::    South latitudes are negative, east longitudes are positive           :*/
/*::                                                                         :*/
/*::  Passed to function:                                                    :*/
/*::    lat1, lon1 = Latitude and Longitude of point 1 (in decimal degrees)  :*/
/*::    lat2, lon2 = Latitude and Longitude of point 2 (in decimal degrees)  :*/
/*::    unit = the unit you desire for results                               :*/
/*::           where: 'M' is statute miles (default)                         :*/
/*::                  'K' is kilometers                                      :*/
/*::                  'N' is nautical miles                                  :*/
/*::  Worldwide cities and other features databases with latitude longitude  :*/
/*::  are available at http://www.geodatasource.com                          :*/
/*::                                                                         :*/
/*::  For enquiries, please contact sales@geodatasource.com                  :*/
/*::                                                                         :*/
/*::  Official Web site: http://www.geodatasource.com                        :*/
/*::                                                                         :*/
/*::           GeoDataSource.com (C) All Rights Reserved 2015                :*/
/*::                                                                         :*/
/*::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::*/


nx.distanceLatLng = function (lat1, lon1, lat2, lon2, unit) {
  const theta = lon1 - lon2;
  let dist = Math.sin(nx.deg2rad(lat1)) * Math.sin(nx.deg2rad(lat2)) + Math.cos(nx.deg2rad(lat1)) * Math.cos(nx.deg2rad(lat2)) * Math.cos(nx.deg2rad(theta));
  dist = Math.acos(dist);
  dist = nx.rad2deg(dist);
  dist = dist * 60 * 1.1515;

  if (unit == 'K') {
    dist = dist * 1.609344;
  } else if (unit == 'N') {
    dist = dist * 0.8684;
  } else if (unit == 'F') {
    dist *= 5280;
  }

  return (dist);
}


/*:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::*/
/*::  This function converts decimal degrees to radians             :*/
/*:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::*/

nx.deg2rad = function (deg) {
  return (deg * Math.PI / 180.0);
}


/*:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::*/
/*::  This function converts radians to decimal degrees             :*/
/*:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::*/

nx.rad2deg = function (rad) {
  return (rad * 180 / Math.PI);
}

/*
  // System.out.printf("%8.10f, %8.10f\n",
  // (33.59307044158479 - 33.59309786854634),
  // (-84.71678148950154 - (-84.71674283218286)));

  console.log(DistanceLatLng(
    33.773178, -79.920094,
    32.781666666666666,-79.916666666666671,
    'N') + " Feet\n");

  // System.out.println(l.distance(32.9697, -96.80322, 29.46786, -98.53506, 'M') + " Miles\n");
  // System.out.println(l.distance(32.9697, -96.80322, 29.46786, -98.53506, 'K') + " Kilometers\n");
  // System.out.println(l.distance(32.9697, -96.80322, 29.46786, -98.53506, 'N') + " Nautical Miles\n");
*/


nx.launchBrowser = function (url) {
  const {exec} = require('child_process');

  if (url === undefined) {
    console.error('Please enter a URL, e.g. "http://google.com"');
    process.exit(0);
  }

  let command;
  let opts = {};

  if (nx.platform === 'win32') {
    command = `"c:\\Program Files\\Mozilla Firefox\\firefox.exe" ${url}`;
  } else if (nx.platform === 'darwin') {
    command = `open -a "Google Chrome" ${url}`;
  } else {
    command = `google-chrome --no-sandbox ${url}`;
  }

  exec(command, opts);
}


nx.getchar = function (cb) {
  if (!cb) {   // no callback, do readSync
    const buffer = Buffer.alloc(1);
    fs.readSync(0, buffer, 0, 1);
    return buffer.toString('utf8');
  }
  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  stdin.on('data', function (key) {
    key = key.toString();
    cb(null, key.length, key);
  });
}

nx.putchar = function (ch) {
  return nx.puts(ch);
}

nx.putAscii = function (string) {
  string = string ? string : '';
  for (let i = 0, ilen = string.length; i < ilen; i++) {
    const ascii = string.charCodeAt(i);
    nx.puts(ascii);
  }
}

nx.puts = function (string, cb) {
  cb = cb || funcion(){};
  string = string ? string : '';
  return fs.write(1, string.toString(), cb);
}
