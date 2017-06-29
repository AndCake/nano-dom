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
	var attributeRegExp = /\s+([\w:_-]+)(?:\s*=\s*(?:'([^']+)'|"([^"]+)"))?/g;
	var match = void 0;

	while (match = attributeRegExp.exec(attributes)) {
		node.setAttribute(match[1], match[2] || match[3]);
		if (match[1] === 'class') {
			node.classList.add(match[2] || match[3]);
		} else if (match[1] === 'title' || match[1] === 'name' || match[1] === 'id') {
			node[match[1]] = match[2] || match[3];
		}
	}
}
var position = -1;

function parse(document, html, parentNode) {
	var tagRegExp = /<(\/)?([\w:_-]+)(\s+(?:[^\/>]|\/[^>])+)?(\/)?>/g;
	var match = void 0;

	if (!html.match(tagRegExp)) {
		parentNode.appendChild(document.createTextNode(html));
	}
	while (match = tagRegExp.exec(html)) {
		if (position > match.index) continue;
		if (match[1]) {
			// closing tag
			var content = html.substring(position, match.index);
			if (content) {
				parentNode.appendChild(document.createTextNode(content));
			}
			position = match.index + match[0].length;
			return;
		} else {
			// opening tag
			var _content = html.substring(position, match.index);
			if (_content) {
				parentNode.appendChild(document.createTextNode(_content));
			}
			var node = document.createElement(match[2]);
			parseAttributes(node, match[3]);
			position = match.index + match[0].length;
			if (!match[4]) {
				parse(document, html, node);
			}
			parentNode.appendChild(node);
		}
	}
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
	var _this = this;

	this.nodeType = 1;
	this.nodeName = name;
	this.tagName = name;
	this.className = '';
	this.childNodes = [];
	this.style = {};
	this.ownerDocument = owner;
	this.parentNode = null;
	this.attributes = [];
	Object.defineProperty(this, 'children', {
		get: function get() {
			return _this.childNodes.filter(function (node) {
				return node.nodeType === 1;
			});
		}
	});
	Object.defineProperty(this, 'classList', {
		get: function get() {
			return new ClassList(_this);
		}
	});
	Object.defineProperty(this, 'innerHTML', {
		get: function get() {
			return _this.childNodes.map(function (tag) {
				return tag.nodeType === 1 ? tag.outerHTML : tag.nodeValue;
			}).join('');
		},
		set: function set(value) {
			position = -1;
			_this.childNodes = [];
			parse(owner, value, _this);
		}
	});
	Object.defineProperty(this, 'outerHTML', {
		get: function get() {
			if (Object.prototype.toString.call(_this.attributes) !== '[object Array]') {
				_this.attributes = Object.keys(_this.attributes).map(function (entry) {
					return { name: entry, value: _this.attributes[entry] };
				});
				_this.attributes.forEach(function (attr, idx, arr) {
					_this.attributes[attr.name] = attr.value;
				});
			}
			var attributes = _this.attributes.map(function (attr) {
				return attr.name + '="' + (typeof attr.value === 'undefined' ? '' : attr.value) + '"';
			}).join(' ');
			if (selfClosing.indexOf(_this.tagName) >= 0) {
				return '<' + _this.tagName + (attributes ? ' ' + attributes : '') + '/>';
			} else {
				return '<' + _this.tagName + (attributes ? ' ' + attributes : '') + '>' + _this.innerHTML + '</' + _this.tagName + '>';
			}
		}
	});
	this.appendChild = function (child) {
		_this.childNodes.push(child);
		child.parentNode = _this;
	};
	this.removeChild = function (child) {
		without(_this.childNodes, child);
	};
	this.setAttribute = function (name, value) {
		_this.attributes.push({ name: name, value: value });
		_this.attributes[name] = value;
	};
	this.removeAttribute = function (name) {
		without(_this.attributes, name, 'name');
		delete _this.attributes[name];
	};
	this.getAttribute = function (name) {
		return _this.attributes[name] || '';
	};
	this.replaceChild = function (newChild, toReplace) {
		var idx = _this.childNodes.indexOf(toReplace);
		_this.childNodes[idx] = newChild;
		newChild.parentNode = _this;
	};
	this.addEventListener = function () {};
	this.removeEventListener = function () {};
	this.getElementsByTagName = function (tagName) {
		return spread(_this.children.filter(function (tag) {
			return tag.tagName === tagName;
		}).concat(_this.children.map(function (tag) {
			return tag.getElementsByTagName(tagName);
		})));
	};
	this.getElementsByClassName = function (className) {
		return spread(_this.children.filter(function (tag) {
			return tag.classList.contains(className);
		}).concat(_this.children.map(function (tag) {
			return tag.getElementsByClassName(className);
		})));
	};
	this.querySelectorAll = function (selector) {
		return spread(_this.children.filter(function (tag) {
			return matchesSelector(tag, selector);
		}).concat(_this.children.map(function (tag) {
			return tag.querySelectorAll(selector);
		})));
	};
}

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
	position = -1;

	if (html.trim().indexOf('<!DOCTYPE') < 0) {
		this.head = this.createElement('head');
		this.body = this.createElement('body');
		this.documentElement.appendChild(this.head);
		this.documentElement.appendChild(this.body);
		parse(this, html, this.body);
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
