'use strict';

var assert = require('assert');
var optparser = require('../lib/optparser');


// setup


var BANNER = [
	'',
	'Testing banner.',
	'',
	'Options:'
].join('\n');


var options = {};


var parser = new optparser.OptionParser()
	.on('-c', '--choice VALUE', ['opt_a', 'opt_b', 'opt_c'], 'selection with predefined options', function(val) {
		options['choice'] = val;
	})
	.on('-o', '--optional [VALUE]', 'option with optional value', function(val) {
		options['optional'] = val;
	})
	.on('-d', '--default [VALUE]', '*this is default value', 'option with optional/default value', function (val) {
		options['default'] = val;
	})
	.on('-s', '--switch', 'simple switch', function(val) {
		options['switch'] = val;
	})
	/*.on('-n', '--[no-]two-options', 'switch with two options', function(state) {
		options['two_options'] = state;
	})*/
	.on('-l', '--list [LIST]', '*all', 'list (ex: "core,ui")', function(list) {
		options['list'] = list.split(/,\s*/);
	})
	.on/*_tail*/('-v', '--version', 'display optparser version', function() {
		console.log("optparser version " + optparser.version.join('.'));
	})
	.on/*_tail*/('-h', '--help', 'display optparser help', function() {
		parser.print();
	})
	.unmatched(function(arg) {
		console.log('unmatched: ' + arg);
	})
	.error(function(err) {
		console.log('FAIL: ' + err.message);
	})
	.banner(BANNER);
	

// tests


function check(left, right) {
	if ((""+options[left]) == (""+right)) {
		console.log('pass: ' + left + ' => ' + options[left] + ' == ' + right);
	} else {
		console.log('FAIL: ' + left + ' => ' + options[left] + ' == ' + right);
	}
}


parser.parse(['-v']);
parser.parse(['-h']);


console.log('\nshould pass ...');

parser.parse(['--choice', 'opt_a']);
check('choice', 'opt_a');

parser.parse(['--default']);
check('default', 'this is default value');

parser.parse(['--default', 'test']);
check('default', 'test');

parser.parse(['--optional']);
check('optional', true);

parser.parse(['--optional', 'test']);
check('optional', 'test');

parser.parse(['--switch']);
check('switch', true);

parser.parse(['--switch', 'test']);
check('switch', true);

parser.parse(['--list']);
check('list', 'all');

parser.parse(['--list', 'first, second']);
check('list', ['first', 'second']);


console.log('\nshould fail ...');

parser.parse(['--choice']);
parser.parse(['--choice', 'custom']);
