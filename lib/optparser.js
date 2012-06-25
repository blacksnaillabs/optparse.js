'use strict';

var util = require('util');
var pkg_info = require('../package.json');


module.exports.version = pkg_info.version.split('.');


module.exports.OptionParser = function() {
	var _banner    = null;
	var _options   = {};
	var _unmatched = null;
	var _error     = null;

	this.banner = function(text) {
		_banner = text;
		
		// done
		return this;
	}
	
	this.on = function() {

		// default option
		var option = {
			'abbr': null,
			'full': null,
			'param': {
				'name':    null,
				'type':    'string',  // 'string', 'choice', 'bool'
				'policy':  'unasked', // 'unasked', 'optional', 'required'
				'default': null,
				'values':  []
			},
			'desc': null,
			'callback': null
		};

		// parse arguments and fill option object
		var args = [].splice.call(arguments, 0);
		args.forEach(function(val) {
			if (util.isArray(val) == true) {
				if (option['param']['type'] != 'string') {
					throw new Error("Can't use choice for bool option :" + option['full']);
				}
				option['param']['type']   = 'choice';
				option['param']['values'] = val;
			} else if (typeof(val) === 'function') {
				option['callback'] = val;
			} else if (typeof(val) === 'string') {
				if ((/^--/).test(val) == true) {
					var parts = val.split(' ');
					if (parts.length > 1) {
						option['param']['name']   = parts[1];
						option['param']['policy'] = (/^\[/).test(parts[1]) ? 'optional' : 'required';
					}
					if ((/^--\[no-\]/).test(val) == true) {
						option['full'] = '--' + parts[0].substr(7);
						option['param']['type'] = 'bool';
					} else {
						option['full'] = parts[0];
					}
				} else if ((/^-/).test(val) == true) {
					option['abbr'] = val;
				} else if ((/^\*/).test(val) == true) {
					option['param']['default'] = val.substr(1);
				} else {
					option['desc'] = val;
				}
			}
		});

		// add option in to the list
		add('abbr', option);
		add('full', option);
		
		//console.log(option);
		
		// done
		return this;
	}

	this.unmatched = function(callback) {
		// setup callback for umatched arguments
		if (callback == null || typeof(callback) === 'function') {
			_unmatched = callback;
		}
		
		// done
		return this;
	}
	
	this.error = function(callback) {
		// setup callback for umatched arguments
		if (callback == null || typeof(callback) === 'function') {
			_error = callback;
		}
		
		// done
		return this;
	}
	
	this.parse = function(argv) {
		argv = argv || process.argv.slice(2);
		
		var option = null;
		argv.forEach(function(val) {
			var isoption = val in _options;
			if (option != null) {
				if (_options[option]['param']['policy'] == 'unasked') {
					call(option);
				} else {
					call(option, isoption ? null : val);
					option = isoption ? val : null;
					return;
				}
			}
			if (isoption) {
				option = val;
			} else if (val == '-h' || val == '--help') {
				print_impl();
				process.exit();
			} else if (_unmatched != null) {
				_unmatched(val);
			}
		});
		
		if (option != null) {
			call(option);
		}

		// done
		return this;
	}
	
	this.print = function() {
		print_impl();
	}
	
	// private
	
	function print_impl() {
		var lines    = _banner ? [_banner] : [];
		var options  = [];
		var maxwidth = 0;
		
		// collect all options and deduce their maximal width
		Object.keys(_options).forEach(function(key) {
			var option = _options[key];
			
			if (options.indexOf(option) == -1) {
				options[options.length] = option;
				
				var width = format(option).length;
				if (width > maxwidth) {
					maxwidth = width;
				}
			}
		});
		
		// format options
		options.forEach(function(val) {
			lines[lines.length] = format(val, maxwidth + 2);
		});
		
		// log entire text
		console.log(lines.join('\n'));
	}
	
	function format(option, desc_offset, base_offset) {
		base_offset = base_offset || 2;
		var line  = Array(base_offset + 1).join(' ');
		var param = option['param'];
		
		if (option['abbr'] != null) {
			line += option['abbr'];
		}
		
		if (option['full'] != null) {
			if (line.length > base_offset) {
				line += ', ';
			}
			if (param['type'] == 'bool') {
				line += '--[no-]' + option['full'].substr(2);
			} else {
				line += option['full'];
			}
			if (param['name'] != null) {
				line += ' ' + param['name'];
			}
		}
		
		if (desc_offset != null) {
			var offset = desc_offset >= line.length ? desc_offset - line.length : desc_offset;
			
			line += Array(offset + 1).join(' ');
			if (option['desc'] != null) {
				line += option['desc'] + ' ';
			}
			if (param['policy'] != 'unasked') {
				var hints = [];
				if (param['type'] == 'choice') {
					hints[hints.length] = 'options: "' + param['values'].join('|') + '"';
				}
				if (param['default'] != null) {
					hints[hints.length] = 'default: "' + param['default'] + '"';
				}
				if (hints.length > 0) {
					line += '(' + hints.join(', ') + ')';
				}
			}
		}
		
		return line;
	}

	function add(key, option) {
		var val = option[key];
		
		if (val != null) {
			add_impl(val, option);

			if (option['param']['type'] == 'bool') {
				throw new Error('Not implemented!');
			}
		}
	}

	function add_impl(key, option) {
		if (key in _options) {
			throw new Error("Attempt to add duplicate option: " + key);
		} else {
			_options[key] = option;
		}
	}

	function call(key, arg) {
		var option   = _options[key];
		var param    = option['param'];
		var callback = option['callback'];
		
		if (callback == null) { return; }
		
		if (arg == null) {
			if (param['type'] == 'bool') {
				arg = (/^--no-/).test(key) == true ? false : true;
			} else if (param['policy'] == 'optional') {
				arg = param['default'] || true;
			} else if (param['policy'] == 'unasked') {
				arg = true;
			}
		}
			
		if (check(option, arg) == true) {
			callback(arg);
		}
	}

	function check(option, arg) {
		var param  = option['param'];
		var policy = param['policy'];
		
		if (policy == 'unasked') { return true; }
		
		if (arg == null && policy == 'required') {
			return fire_error(option, param['name'] + ' required for "' + option['full'].substr(2) + '"!');
		} else if (param['type'] == 'choice' && param['values'].indexOf(arg) == -1) {
			return fire_error(option, 'Invalid ' + param['name'] + ' for "' + option['full'].substr(2) + '": ' + arg);
		}
		
		return true;
	}

	function fire_error(option, msg) {
		if (_error != null) {
			_error({
				option: option,
				message: msg,
				hint: format(option, 2)
			});
		} else {
			console.log(msg);
			console.log('\n' + format(option, 2));
			process.exit(1);
		}
		return false;
	}
};
