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
	let attributeRegExp = /\s+([\w:_-]+)(?:\s*=\s*(?:'([^']+)'|"([^"]+)"))?/g;
	let match;

	while (match = attributeRegExp.exec(attributes)) {
		node.setAttribute(match[1], match[2] || match[3]);
		if (match[1] === 'class') {
			node.classList.add(match[2] || match[3]);
		} else if (match[1] === 'title' || match[1] === 'name' || match[1] === 'id') {
			node[match[1]] = match[2] || match[3];
		}
	}
}
let position = -1;

function parse(document, html, parentNode) {
	let tagRegExp = /<(\/)?([\w:_-]+)(\s+(?:[^\/>]|\/[^>])+)?(\/)?>/g;
	let match;

	if (!html.match(tagRegExp)) {
		parentNode.appendChild(document.createTextNode(html));
	}
	while (match = tagRegExp.exec(html)) {
		if (position > match.index) continue;
		if (match[1]) {
			// closing tag
			let content = html.substring(position, match.index);
			if (content) {
				parentNode.appendChild(document.createTextNode(content));
			}
			position = match.index + match[0].length;
			return;
		} else {
			// opening tag
			let content = html.substring(position, match.index);
			if (content) {
				parentNode.appendChild(document.createTextNode(content));
			}
			let node = document.createElement(match[2]);
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
	Object.defineProperty(this, 'children', {
		get: () => this.childNodes.filter(node => node.nodeType === 1)
	});
	Object.defineProperty(this, 'classList', {
		get: () => new ClassList(this)
	});
	Object.defineProperty(this, 'innerHTML', {
		get: () => {
			return this.childNodes.map(tag => tag.nodeType === 1 ? tag.outerHTML : tag.nodeValue).join('');
		},
		set: (value) => {
			position = -1;
			this.childNodes = [];
			parse(owner, value, this);
		}
	});
	Object.defineProperty(this, 'outerHTML', {
		get: () => {
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
	this.appendChild = child => {
		this.childNodes.push(child);
		child.parentNode = this;
	};
	this.removeChild = child => {
		without(this.childNodes, child);
	};
	this.setAttribute = (name, value) => {
		this.attributes.push({name, value});
		this.attributes[name] = value;
	};
	this.removeAttribute = name => {
		without(this.attributes, name, 'name');
		delete this.attributes[name];
	};
	this.getAttribute = name => this.attributes[name] || '';
	this.replaceChild = (newChild, toReplace) => {
		let idx = this.childNodes.indexOf(toReplace);
		this.childNodes[idx] = newChild;
		newChild.parentNode = this;
	};
	this.addEventListener = () => {};
	this.removeEventListener = () => {};
	this.getElementsByTagName = tagName => {
		return spread(this.children.filter(tag => tag.tagName === tagName).concat(this.children.map(tag => tag.getElementsByTagName(tagName))));
	};
	this.getElementsByClassName = className => {
		return spread(this.children.filter(tag => tag.classList.contains(className)).concat(this.children.map(tag => tag.getElementsByClassName(className))));
	};
	this.querySelectorAll = selector => {
		return spread(this.children.filter(tag => matchesSelector(tag, selector)).concat(this.children.map(tag => tag.querySelectorAll(selector))));
	};
}

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

	this.createElement = name => new DOMElement(name, this);
	this.createTextNode = content => new DOMText(content, this);
	this.getElementsByTagName = name => spread(this.children.filter(tag => tag.tagName === name).concat(this.children.map(tag => tag.getElementsByTagName(name))));
	this.getElementsByClassName = className => spread(this.children.filter(tag => tag.classList.contains(className)).concat(this.children.map(tag => tag.getElementsByClassName(className))));
	this.querySelectorAll = selector => spread(this.children.filter(tag => matchesSelector(tag, selector)).concat(this.children.map(tag => tag.querySelectorAll(selector))));
	this.addEventListener = () => {};
	this.removeEventListener = () => {};

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
