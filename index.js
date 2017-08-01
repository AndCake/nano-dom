'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var selfClosing = ['input', 'link', 'meta', 'hr', 'br', 'source', 'img'];

function without(arr, element, attr) {
	var idx = void 0;
	arr.forEach(function (node, index) {
		if (attr && node[attr] === element || node === element) {
			idx = index;
		}
	});
	arr.splice(idx, 1);
	return arr;
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
		while (position < html.length && html[position] !== '>') {
			position++;
		}
		if (position < html.length) {
			var endAttrs = position;
			if (endAttrs - startAttrs > 1) {
				// we have something
				if (html[position - 1] === '/') {
					match[4] = '/';
					endAttrs = position - 1;
				}
				match[3] = html.substring(startAttrs, endAttrs);
			}
		}
		match[0] = html.substring(match.index, position + 1);
	}
	return match;
}

function parse(document, html, parentNode) {
	var match = void 0;

	while (match = getNextTag(html)) {
		if (match[1]) {
			// closing tag
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
			if (!match[4]) {
				html = parse(document, html.substr(match.index + match[0].length), node);
			} else {
				html = html.substr(match.index + match[0].length);
			}
			parentNode.appendChild(node);
		}
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

function spread(arr) {
	var result = [];
	arr.forEach(function (entry) {
		result = result.concat(entry);
	});
	return result;
}

function DOMElement(name, owner) {
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

Object.defineProperty(DOMElement.prototype, 'children', {
	get: function get() {
		return this.childNodes.filter(function (node) {
			return node.nodeType === 1;
		});
	}
});
Object.defineProperty(DOMElement.prototype, 'classList', {
	get: function get() {
		return new ClassList(this);
	}
});
Object.defineProperty(DOMElement.prototype, 'innerHTML', {
	get: function get() {
		return this.childNodes.map(function (tag) {
			return tag.nodeType === 1 ? tag.outerHTML : tag.nodeValue;
		}).join('');
	},
	set: function set(value) {
		this.childNodes = [];
		parse(owner, value, this);
	}
});
Object.defineProperty(DOMElement.prototype, 'outerHTML', {
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
		if (selfClosing.indexOf(this.tagName) >= 0) {
			return '<' + this.tagName + (attributes ? ' ' + attributes : '') + '/>';
		} else {
			return '<' + this.tagName + (attributes ? ' ' + attributes : '') + '>' + this.innerHTML + '</' + this.tagName + '>';
		}
	}
});
DOMElement.prototype.appendChild = function (child) {
	this.childNodes.push(child);
	child.parentNode = this;
};
DOMElement.prototype.removeChild = function (child) {
	without(this.childNodes, child);
};
DOMElement.prototype.setAttribute = function (name, value) {
	var obj = { name: name, value: value };
	this.attributes.push(obj);
	this.attributes[name] = obj;
};
DOMElement.prototype.removeAttribute = function (name) {
	without(this.attributes, name, 'name');
	delete this.attributes[name];
};
DOMElement.prototype.getAttribute = function (name) {
	return this.attributes[name] && this.attributes[name].value || '';
};
DOMElement.prototype.replaceChild = function (newChild, toReplace) {
	var idx = this.childNodes.indexOf(toReplace);
	this.childNodes[idx] = newChild;
	newChild.parentNode = this;
};
DOMElement.prototype.addEventListener = function () {};
DOMElement.prototype.removeEventListener = function () {};
DOMElement.prototype.getElementsByTagName = function (tagName) {
	return spread(this.children.filter(function (tag) {
		return tag.tagName === tagName;
	}).concat(this.children.map(function (tag) {
		return tag.getElementsByTagName(tagName);
	})));
};
DOMElement.prototype.getElementsByClassName = function (className) {
	return spread(this.children.filter(function (tag) {
		return tag.classList.contains(className);
	}).concat(this.children.map(function (tag) {
		return tag.getElementsByClassName(className);
	})));
};
DOMElement.prototype.querySelectorAll = function (selector) {
	return spread(this.children.filter(function (tag) {
		return matchesSelector(tag, selector);
	}).concat(this.children.map(function (tag) {
		return tag.querySelectorAll(selector);
	})));
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
		return new DOMElement(name, _this2);
	};
	this.createTextNode = function (content) {
		return new DOMText(content, _this2);
	};
	this.getElementsByTagName = function (name) {
		return spread(_this2.children.filter(function (tag) {
			return tag.tagName === name;
		}).concat(_this2.children.map(function (tag) {
			return tag.getElementsByTagName(name);
		})));
	};
	this.getElementsByClassName = function (className) {
		return spread(_this2.children.filter(function (tag) {
			return tag.classList.contains(className);
		}).concat(_this2.children.map(function (tag) {
			return tag.getElementsByClassName(className);
		})));
	};
	this.querySelectorAll = function (selector) {
		return spread(_this2.children.filter(function (tag) {
			return matchesSelector(tag, selector);
		}).concat(_this2.children.map(function (tag) {
			return tag.querySelectorAll(selector);
		})));
	};
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
		typeof html === 'string' && parse(this, html, this.body);
	} else {
		html.match(/<html([^>]*)>/);
		if (RegExp.$1) {
			parseAttributes(this.documentElement, RegExp.$1);
		}
		html = html.replace(/<!DOCTYPE[^>]+>[\n\s]*<html([^>]*)>/g, '').replace(/<\/html>/g, '');

		parse(this, html, this.documentElement);
		this.head = this.getElementsByTagName('head')[0];
		this.body = this.getElementsByTagName('body')[0];
	}
}

module.exports = Document;
module.exports.DOMElement = DOMElement;
module.exports.DOMText = DOMText;
