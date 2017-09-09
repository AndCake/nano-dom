const selfClosing = ['input', 'link', 'meta', 'hr', 'br', 'source', 'img'];

function without(arr, element, attr) {
	let idx;
	arr.forEach((node, index) => {
		if ((attr && node[attr] === element) || node === element) {
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
	let match = [];
	let position = 0;
	let charCode = attributes.charCodeAt(position);
	while (charCode >= 65 && charCode <= 90 || 	// upper-cased characters
		   charCode >= 97 && charCode <= 122 || // lower-cased characters
		   charCode >= 48 && charCode <= 57 ||  // numbers
		   charCode === 58 || charCode === 45 || // colons and dashes
	       charCode === 95) {					// underscores
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

function getNextTag(html, position = -1) {
	let match = null;
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
		let charCode = html.charCodeAt(position);
		// read all tag name characters
		while (charCode >= 65 && charCode <= 90 || 	// upper-cased characters
			   charCode >= 97 && charCode <= 122 || // lower-cased characters
			   charCode >= 48 && charCode <= 57 ||  // numbers
			   charCode === 58 || charCode === 45 || // colons and dashes
		       charCode === 95) {					// underscores
			match[2] = (match[2] || '') + html.charAt(position);
			charCode = html.charCodeAt(++position);
		}
		if (!match[2]) {
			return getNextTag(html, html.indexOf('<', position));
		}
		let startAttrs = position;
		while (position < html.length && html[position] !== '>') {
			position++;
		}
		if (position < html.length) {
			let endAttrs = position;
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
	let match;

	while (match = getNextTag(html)) {
		if (match[1]) {
			// closing tag
			let content = html.substring(0, match.index);
			if (content) {
				parentNode.appendChild(document.createTextNode(content));
			}
			return html.substr(match.index + match[0].length);
		} else {
			// opening tag
			let content = html.substring(0, match.index);
			if (content) {
				parentNode.appendChild(document.createTextNode(content));
			}
			let node = document.createElement(match[2]);
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
const regExp = function(name) {
	return new RegExp('(^| )'+ name +'( |$)');
};
const forEach = function(list, fn, scope) {
	for (let i = 0; i < list.length; i++) {
		fn.call(scope, list[i]);
	}
};

// class list object with basic methods
function ClassList(element) {
	this.element = element;
}

ClassList.prototype = {
	add: function() {
		forEach(arguments, function(name) {
			if (!this.contains(name)) {
				this.element.className += this.element.className.length > 0 ? ' ' + name : name;
			}
		}, this);
	},
	remove: function() {
		forEach(arguments, function(name) {
			this.element.className =
				this.element.className.replace(regExp(name), '');
		}, this);
	},
	toggle: function(name) {
		return this.contains(name)
			? (this.remove(name), false) : (this.add(name), true);
	},
	contains: function(name) {
		return regExp(name).test(this.element.className);
	},
	// bonus..
	replace: function(oldName, newName) {
		this.remove(oldName), this.add(newName);
	}
};

function matchesSelector(tag, selector) {
	let selectors = selector.split(/\s*,\s*/),
		match;
	for (let all in selectors) {
		if (match = selectors[all].match(/(?:([\w*:_-]+)?\[([\w:_-]+)(?:(\$|\^|\*)?=(?:(?:'([^']*)')|(?:"([^"]*)")))?\])|(?:\.([\w_-]+))|([\w*:_-]+)/g)) {
			let value = RegExp.$4 || RegExp.$5;
			if (RegExp.$7 === tag.tagName || RegExp.$7 === '*') return true;
			if (RegExp.$6 && tag.classList.contains(RegExp.$6)) return true;
			if (RegExp.$1 && tag.tagName !== RegExp.$1) continue;
			let attribute = tag.getAttribute(RegExp.$2);
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
	let result = [];
	arr.forEach(entry => {
		result = result.concat(entry);
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
	get: function() { return this.childNodes.filter(node => node.nodeType === 1) }
});
Object.defineProperty(HTMLElement.prototype, 'classList', {
	get: function() { return new ClassList(this); }
});
Object.defineProperty(HTMLElement.prototype, 'innerHTML', {
	get: function() {
		return this.childNodes.map(tag => tag.nodeType === 1 ? tag.outerHTML : tag.nodeValue).join('');
	},
	set: function (value) {
		this.childNodes = [];
		parse(this.ownerDocument, value, this);
	}
});
Object.defineProperty(HTMLElement.prototype, 'outerHTML', {
	get: function() {
		if (Object.prototype.toString.call(this.attributes) !== '[object Array]') {
			this.attributes = Object.keys(this.attributes).map(entry => ({name: entry, value: this.attributes[entry]}));
			this.attributes.forEach((attr, idx, arr) => {
				this.attributes[attr.name] = attr.value;
			});
		}
		let attributes = this.attributes.map(attr => `${attr.name}="${typeof attr.value === 'undefined'?'':attr.value}"`).join(' ');
		if (selfClosing.indexOf(this.tagName) >= 0) {
			return `<${this.tagName}${attributes ? ' ' + attributes : ''}/>`;
		} else {
			return `<${this.tagName}${attributes ? ' ' + attributes : ''}>${this.innerHTML}</${this.tagName}>`;
		}
	}
});
HTMLElement.prototype.appendChild = function(child) {
	this.childNodes.push(child);
	child.parentNode = this;
};
HTMLElement.prototype.removeChild = function(child) {
	without(this.childNodes, child);
};
HTMLElement.prototype.setAttribute = function(name, value) {
	let obj = {name, value};
	this.attributes.push(obj);
	this.attributes[name] = obj;
};
HTMLElement.prototype.removeAttribute = function(name) {
	without(this.attributes, name, 'name');
	delete this.attributes[name];
};
HTMLElement.prototype.getAttribute = function(name) { return this.attributes[name] && this.attributes[name].value || ''; };
HTMLElement.prototype.replaceChild = function(newChild, toReplace) {
	let idx = this.childNodes.indexOf(toReplace);
	this.childNodes[idx] = newChild;
	newChild.parentNode = this;
};
HTMLElement.prototype.addEventListener = function() {};
HTMLElement.prototype.removeEventListener = function() {};
HTMLElement.prototype.getElementsByTagName = function(tagName) {
	return spread(this.children.filter(tag => tag.tagName === tagName).concat(this.children.map(tag => tag.getElementsByTagName(tagName))));
};
HTMLElement.prototype.getElementsByClassName = function(className) {
	return spread(this.children.filter(tag => tag.classList.contains(className)).concat(this.children.map(tag => tag.getElementsByClassName(className))));
};
HTMLElement.prototype.querySelectorAll = function(selector) {
	return spread(this.children.filter(tag => matchesSelector(tag, selector)).concat(this.children.map(tag => tag.querySelectorAll(selector))));
};
HTMLElement.prototype.getElementById = function(id) {
	let tag = this.children.find(tag => tag.attributes.id && tag.attributes.id.value === id);
	if (!tag) {
		for (let child of this.children) {
			tag = child.getElementById(id);
			if (tag) {
				return tag;
			}
		}
	}
	return tag;
};

function DOMText(content, owner) {
	this.nodeValue = content;
	this.nodeType = 3;
	this.parentNode = null;
	this.ownerDocument = owner;
}

export default function Document(html) {
	if (!this instanceof Document) {
		return new Document(html);
	}

	this.createElement = name => new HTMLElement(name, this);
	this.createTextNode = content => new DOMText(content, this);
	this.getElementById = HTMLElement.prototype.getElementById.bind(this);
	this.getElementsByTagName = name => spread(this.children.filter(tag => tag.tagName === name).concat(this.children.map(tag => tag.getElementsByTagName(name))));
	this.getElementsByClassName = className => spread(this.children.filter(tag => tag.classList.contains(className)).concat(this.children.map(tag => tag.getElementsByClassName(className))));
	this.querySelectorAll = selector => spread(this.children.filter(tag => matchesSelector(tag, selector)).concat(this.children.map(tag => tag.querySelectorAll(selector))));
	this.addEventListener = () => {};
	this.removeEventListener = () => {};

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
module.exports.DOMElement = HTMLElement;
module.exports.DOMText = DOMText;
typeof global !== 'undefined' && (global.HTMLElement = HTMLElement);