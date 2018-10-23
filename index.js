'use strict';

var selfClosing = ['input', 'link', 'meta', 'hr', 'br', 'source', 'img'];

function isCustomSelfClosing(tagName) {
	var tagList = module.exports.options.customSelfClosingTags;
	if (!tagList) return false;
	if (Array.isArray(tagList)) {
		return tagList.indexOf(tagName) >= 0;
	}
	if (tagList instanceof RegExp) {
		return tagList.test(tagName);
	}
	if (typeof tagList === 'string') {
		return new RegExp(tagList).test(tagName);
	}
	throw new Error('Unknown custom self closing tag list format. Please use an array with tag names, a regular expression or a string');
}

function parseAttributes(node, attributes) {
	attributes = (attributes || '').trim();
	if (attributes.length <= 0) {
		return;
	}
	var match = [];
	var position = 0;
	var charCode = attributes.charCodeAt(position);
	while (charCode >= 65 && charCode <= 90 || // upper-cased characters
	charCode >= 97 && charCode <= 122 || // lower-cased characters
	charCode >= 48 && charCode <= 57 || // numbers
	charCode === 58 || charCode === 45 || // colons and dashes
	charCode === 95) {
		// underscores
		match[1] = (match[1] || '') + attributes.charAt(position);
		charCode = attributes.charCodeAt(++position);
	}
	attributes = attributes.substr(position).trim();
	if (attributes[0] !== '=') {
		if (attributes[0] === '<') {
			throw new Error('Unexpected markup while parsing attributes for ' + node.tagName + ' at ' + attributes);
		}
		node.setAttribute(match[1], match[1]);
		parseAttributes(node, attributes);
	} else {
		attributes = attributes.substr(1).trim();
		if (attributes[0] === '"' || attributes[0] === "'") {
			// search for another "
			position = 1;
			while (attributes[position] !== attributes[0]) {
				match[2] = (match[2] || '') + attributes[position];
				position += 1;
			}
			attributes = attributes.substr(position + 1);
		} else {
			match[2] = attributes.split(' ')[0];
			attributes = attributes.split(' ').slice(1).join(' ');
		}
		node.setAttribute(match[1], match[2]);
		if (match[1] === 'class') {
			node.classList.add(match[2]);
		} else if (match[1] === 'title' || match[1] === 'id' || match[1] === 'name') {
			node[match[1]] = match[2];
		}
		return parseAttributes(node, attributes);
	}
}

function getNextTag(html) {
	var position = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : -1;

	var match = null;
	if (position < 0) {
		position = html.indexOf('<');
	}
	// we are at a < now or at the end of the string
	if (position >= 0 && position < html.length) {
		match = [];
		match.index = position;
		position += 1;
		if (html[position] === '/') {
			match[1] = '/';
			position += 1;
		}
		var charCode = html.charCodeAt(position);
		// read all tag name characters
		while (charCode >= 65 && charCode <= 90 || // upper-cased characters
		charCode >= 97 && charCode <= 122 || // lower-cased characters
		charCode >= 48 && charCode <= 57 || // numbers
		charCode === 58 || charCode === 45 || // colons and dashes
		charCode === 95) {
			// underscores
			match[2] = (match[2] || '') + html.charAt(position);
			charCode = html.charCodeAt(++position);
		}
		if (!match[2]) {
			return getNextTag(html, html.indexOf('<', position));
		}
		var startAttrs = position;
		var isInAttributeValue = false;
		while (position < html.length && (html[position] !== '>' || isInAttributeValue)) {
			if (html[position] === '"') isInAttributeValue = !isInAttributeValue;
			position++;
		}
		if (position < html.length) {
			var endAttrs = position;
			if (html[position - 1] === '/') {
				match[4] = '/';
				endAttrs = position - 1;
			}
			if (endAttrs - startAttrs > 1) {
				// we have something
				match[3] = html.substring(startAttrs, endAttrs);
			}
		}
		match[0] = html.substring(match.index, position + 1);
	}
	return match;
}

var level = [];
function parse(document, html, parentNode) {
	var match = void 0;

	while (match = getNextTag(html)) {
		if (match[1]) {
			// closing tag
			if (level.length === 0) throw new Error('Unexpected closing tag ' + match[2]);
			var closed = level.pop();
			if (closed !== match[2]) throw new Error('Unexpected closing tag ' + match[2] + '; expected ' + closed);
			var content = html.substring(0, match.index);
			if (content) {
				parentNode.appendChild(document.createTextNode(content));
			}
			return html.substr(match.index + match[0].length);
		} else {
			// opening tag
			var _content = html.substring(0, match.index);
			if (_content) {
				parentNode.appendChild(document.createTextNode(_content));
			}
			var node = document.createElement(match[2]);
			parseAttributes(node, match[3]);
			if (!match[4] && selfClosing.indexOf(match[2]) < 0 && !isCustomSelfClosing(match[2])) {
				level.push(match[2]);
				html = parse(document, html.substr(match.index + match[0].length), node);
			} else {
				html = html.substr(match.index + match[0].length);
			}
			parentNode.appendChild(node);
		}
	}
	if (level.length > 0) {
		throw new Error('Unclosed tag' + (level.length > 1 ? 's ' : ' ') + level.join(', '));
	}
	if (html.length > 0) {
		parentNode.appendChild(document.createTextNode(html));
	}
	return html;
}

// helpers
var regExp = function regExp(name) {
	return new RegExp('(^| )' + name + '( |$)');
};
var forEach = function forEach(list, fn, scope) {
	for (var i = 0; i < list.length; i++) {
		fn.call(scope, list[i]);
	}
};

// class list object with basic methods
function ClassList(element) {
	this.element = element;
}

ClassList.prototype = {
	add: function add() {
		forEach(arguments, function (name) {
			if (!this.contains(name)) {
				this.element.className += this.element.className.length > 0 ? ' ' + name : name;
			}
		}, this);
	},
	remove: function remove() {
		forEach(arguments, function (name) {
			this.element.className = this.element.className.replace(regExp(name), '');
		}, this);
	},
	toggle: function toggle(name) {
		return this.contains(name) ? (this.remove(name), false) : (this.add(name), true);
	},
	contains: function contains(name) {
		return regExp(name).test(this.element.className);
	},
	// bonus..
	replace: function replace(oldName, newName) {
		this.remove(oldName), this.add(newName);
	}
};

function matchesSelector(tag, selector) {
	var selectors = selector.split(/\s*,\s*/),
	    match = void 0;
	for (var all in selectors) {
		if (match = selectors[all].match(/(?:([\w*:_-]+)?\[([\w:_-]+)(?:(\$|\^|\*)?=(?:(?:'([^']*)')|(?:"([^"]*)")))?\])|(?:\.([\w_-]+))|([\w*:_-]+)/g)) {
			var value = RegExp.$4 || RegExp.$5;
			if (RegExp.$7 === tag.tagName || RegExp.$7 === '*') return true;
			if (RegExp.$6 && tag.classList.contains(RegExp.$6)) return true;
			if (RegExp.$1 && tag.tagName !== RegExp.$1) continue;
			var attribute = tag.getAttribute(RegExp.$2);
			if (!RegExp.$3 && !value && typeof tag.attributes[RegExp.$2] !== 'undefined') return true;
			if (!RegExp.$3 && value && attribute === value) return true;
			if (RegExp.$3 && RegExp.$3 === '^' && attribute.indexOf(value) === 0) return true;
			if (RegExp.$3 && RegExp.$3 === '$' && attribute.match(new RegExp(value + '$'))) return true;
			if (RegExp.$3 && RegExp.$3 === '*' && attribute.indexOf(value) >= 0) return true;
		}
	}
	return false;
}

function findElements(start, filterFn) {
	var result = [];
	start.children.forEach(function (child) {
		result = result.concat(filterFn(child) ? child : [], findElements(child, filterFn));
	});
	return result;
}

function HTMLElement(name, owner) {
	this.nodeType = 1;
	this.nodeName = name;
	this.tagName = name;
	this.className = '';
	this.childNodes = [];
	this.style = {};
	this.ownerDocument = owner;
	this.parentNode = null;
	this.attributes = [];
}

Object.defineProperty(HTMLElement.prototype, 'children', {
	get: function get() {
		return this.childNodes.filter(function (node) {
			return node.nodeType === 1;
		});
	}
});
Object.defineProperty(HTMLElement.prototype, 'classList', {
	get: function get() {
		return new ClassList(this);
	}
});
Object.defineProperty(HTMLElement.prototype, 'innerHTML', {
	get: function get() {
		return this.childNodes.map(function (tag) {
			return tag.nodeType === 1 ? tag.outerHTML : tag.nodeValue;
		}).join('');
	},
	set: function set(value) {
		this.childNodes = [];
		level = [];
		parse(this.ownerDocument, value, this);
	}
});
Object.defineProperty(HTMLElement.prototype, 'outerHTML', {
	get: function get() {
		var _this = this;

		if (Object.prototype.toString.call(this.attributes) !== '[object Array]') {
			this.attributes = Object.keys(this.attributes).map(function (entry) {
				return { name: entry, value: _this.attributes[entry] };
			});
			this.attributes.forEach(function (attr, idx, arr) {
				_this.attributes[attr.name] = attr.value;
			});
		}
		var attributes = this.attributes.map(function (attr) {
			return attr.name + '="' + (typeof attr.value === 'undefined' ? '' : attr.value) + '"';
		}).join(' ');
		if (selfClosing.indexOf(this.tagName) >= 0 || isCustomSelfClosing(this.tagName)) {
			return '<' + this.tagName + (attributes ? ' ' + attributes : '') + '/>';
		} else {
			return '<' + this.tagName + (attributes ? ' ' + attributes : '') + '>' + this.innerHTML + '</' + this.tagName + '>';
		}
	}
});
HTMLElement.prototype.appendChild = function (child) {
	this.childNodes.push(child);
	child.parentNode = this;
};
HTMLElement.prototype.removeChild = function (child) {
	var idx = this.childNodes.indexOf(child);
	if (idx >= 0) this.childNodes.splice(idx, 1);
};
HTMLElement.prototype.setAttribute = function (name, value) {
	var obj = { name: name, value: value };
	if (this.attributes[name]) {
		this.attributes[this.attributes.indexOf(this.attributes[name])] = obj;
	} else {
		this.attributes.push(obj);
	}
	this.attributes[name] = obj;
	if (name === 'class') this.className = value;
};
HTMLElement.prototype.removeAttribute = function (name) {
	var idx = this.attributes.indexOf(this.attributes[name]);
	if (idx >= 0) {
		this.attributes.splice(idx, 1);
	}
	delete this.attributes[name];
};
HTMLElement.prototype.getAttribute = function (name) {
	return this.attributes[name] && this.attributes[name].value || '';
};
HTMLElement.prototype.replaceChild = function (newChild, toReplace) {
	var idx = this.childNodes.indexOf(toReplace);
	this.childNodes.splice(idx, 1, newChild);
	newChild.parentNode = this;
};
HTMLElement.prototype.addEventListener = function () {};
HTMLElement.prototype.removeEventListener = function () {};
HTMLElement.prototype.getElementsByTagName = function (tagName) {
	return findElements(this, function (el) {
		return tagName === '*' && el.tagName || el.tagName === tagName;
	});
};
HTMLElement.prototype.getElementsByClassName = function (className) {
	return findElements(this, function (el) {
		return el.classList.contains(className);
	});
};
HTMLElement.prototype.querySelectorAll = function (selector) {
	return findElements(this, function (el) {
		return matchesSelector(el, selector);
	});
};
HTMLElement.prototype.getElementById = function (id) {
	return findElements(this, function (el) {
		return el.getAttribute('id') === id;
	})[0];
};

function DOMText(content, owner) {
	this.nodeValue = content;
	this.nodeType = 3;
	this.parentNode = null;
	this.ownerDocument = owner;
}

function Document(html) {
	var _this2 = this;

	if (!this instanceof Document) {
		return new Document(html);
	}

	this.createElement = function (name) {
		return new HTMLElement(name, _this2);
	};
	this.createTextNode = function (content) {
		return new DOMText(content, _this2);
	};
	this.getElementById = HTMLElement.prototype.getElementById.bind(this);
	this.getElementsByTagName = HTMLElement.prototype.getElementsByTagName.bind(this);
	this.getElementsByClassName = HTMLElement.prototype.getElementsByClassName.bind(this);
	this.querySelectorAll = HTMLElement.prototype.querySelectorAll.bind(this);
	this.addEventListener = function () {};
	this.removeEventListener = function () {};

	this.documentElement = this.createElement('html');
	this.childNodes = [this.documentElement];
	this.children = [this.documentElement];
	this.nodeType = 9;

	if (typeof html !== 'string' || html.trim().indexOf('<!DOCTYPE') < 0) {
		this.head = this.createElement('head');
		this.body = this.createElement('body');
		this.documentElement.appendChild(this.head);
		this.documentElement.appendChild(this.body);
		if (typeof html === 'string') {
			level = [];
			parse(this, html, this.body);
		}
	} else {
		html.match(/<html([^>]*)>/);
		if (RegExp.$1) {
			parseAttributes(this.documentElement, RegExp.$1);
		}
		html = html.replace(/<!DOCTYPE[^>]+>[\n\s]*<html([^>]*)>/g, '').replace(/<\/html>/g, '');
		level = [];
		parse(this, html, this.documentElement);
		this.head = this.getElementsByTagName('head')[0];
		this.body = this.getElementsByTagName('body')[0];
	}
}

module.exports = Document;
module.exports.DOMElement = HTMLElement;
module.exports.DOMText = DOMText;
module.exports.options = {
	customSelfClosingTags: null
};
typeof global !== 'undefined' && (global.HTMLElement = HTMLElement);

module.exports = Document;
