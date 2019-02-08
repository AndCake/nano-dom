const selfClosing = ['input', 'link', 'meta', 'hr', 'br', 'source', 'img'];

export const options = {
	customSelfClosingTags: [],
};

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

function isCustomSelfClosing(tagName) {
	let tagList = options.customSelfClosingTags;
	if (!tagList) return false;
	if (Array.isArray(tagList)) {
		return tagList.indexOf(tagName) >= 0;
	}
	if (tagList instanceof RegExp) {
		return tagList.test(tagName);
	}
	if (typeof tagList === 'string') {
		return (new RegExp(tagList)).test(tagName);
	}
	throw new Error('Unknown custom self closing tag list format. Please use an array with tag names, a regular expression or a string');
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
		let isInAttributeValue = false;
		while (position < html.length && (html[position] !== '>' || isInAttributeValue)) {
			if (html[position] === '"') isInAttributeValue = !isInAttributeValue;
			position++;
		}
		if (position < html.length) {
			let endAttrs = position;
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

let level = [];
function parse(document, html, parentNode) {
	let match;

	while (match = getNextTag(html)) {
		if (match[1]) {
			// closing tag
			if (level.length === 0) throw new Error('Unexpected closing tag ' + match[2]);
			let closed = level.pop();
			if (closed !== match[2]) throw new Error('Unexpected closing tag ' + match[2] + '; expected ' + closed);
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

function findElements(start, filterFn) {
	let result = [];
	start.children.forEach(child => {
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
	this._eventListeners = {};
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
		level = [];
		parse(this.ownerDocument, value, this);
	}
});
Object.defineProperty(HTMLElement.prototype, 'firstElementChild', {
	get: function () { return this.children[0]; }
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
		if (selfClosing.indexOf(this.tagName) >= 0 || isCustomSelfClosing(this.tagName)) {
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
	let idx = this.childNodes.indexOf(child);
	if (idx >= 0) this.childNodes.splice(idx, 1);
};
HTMLElement.prototype.remove = function() {
	this.parentNode.removeChild(this);
};
HTMLElement.prototype.setAttribute = function(name, value) {
	let obj = {name, value};
	if (this.attributes[name]) {
		this.attributes[this.attributes.indexOf(this.attributes[name])] = obj;
	} else {
		this.attributes.push(obj);
	}
	this.attributes[name] = obj;
	if (name === 'class') this.className = value;
};
HTMLElement.prototype.removeAttribute = function(name) {
	let idx = this.attributes.indexOf(this.attributes[name]);
	if (idx >= 0) {
		this.attributes.splice(idx, 1);
	}
	delete this.attributes[name];
};
HTMLElement.prototype.getAttribute = function(name) {
	if (['value', 'checked', 'disabled', 'selected'].indexOf(name) >= 0) {
		return typeof this[name] !== 'undefined' ? this[name] : this.attributes[name] && this.attributes[name].value;
	} else {
		return this.attributes[name] && this.attributes[name].value || '';
	}
};
HTMLElement.prototype.replaceChild = function(newChild, toReplace) {
	let idx = this.childNodes.indexOf(toReplace);
	this.childNodes.splice(idx, 1, newChild);
	newChild.parentNode = this;
};
HTMLElement.prototype.addEventListener = function(name, fn) {
	this._eventListeners[name] = this._eventListeners[name] || [];
	this._eventListeners[name].push(fn);
};
HTMLElement.prototype.dispatchEvent = function (event) {
	// if we have event listeners registered for the event
	if (this._eventListeners[event.name]) {
		// call them all
		for (let listener, index = 0, len = this._eventListeners[event.name].length; listener = this._eventListeners[event.name][index], index < len; index += 1) {
			let result = listener.call(this, event);
			if (result === false) {
				return;
			}
		}
	}
	// allow the event to bubble up
	if (this.parentNode) this.parentNode.dispatchEvent(event);
};
HTMLElement.prototype.removeEventListener = function(name, fn) {
	if (!fn) {
		delete this._eventListeners[name];
	} else if (this._eventListeners[name]) {
		this._eventListeners[name].splice(this._eventListeners[name].indexOf(fn), 1);
	}
};
HTMLElement.prototype.click = function() {
	this.dispatchEvent({name: 'click', target: this});
};
HTMLElement.prototype.focus = function() {
	this.dispatchEvent({name: 'focus', target: this});
};
HTMLElement.prototype.blur = function() {
	this.dispatchEvent({name: 'blur', target: this});
};
HTMLElement.prototype.getElementsByTagName = function(tagName) {
	return findElements(this, el => ((tagName === '*' && el.tagName) || el.tagName === tagName));
};
HTMLElement.prototype.getElementsByClassName = function(className) {
	return findElements(this, el => el.classList.contains(className));
};
HTMLElement.prototype.querySelectorAll = function(selector) {
	return findElements(this, el => matchesSelector(el, selector));
};
HTMLElement.prototype.querySelector = function(selector) {
	return this.querySelectorAll(selector)[0];
};
HTMLElement.prototype.getElementById = function(id) {
	return findElements(this, el => el.getAttribute('id') === id)[0];
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
	this.getElementsByTagName = HTMLElement.prototype.getElementsByTagName.bind(this);
	this.getElementsByClassName = HTMLElement.prototype.getElementsByClassName.bind(this);
	this.querySelectorAll = HTMLElement.prototype.querySelectorAll.bind(this);
	this.querySelector = HTMLElement.prototype.querySelector.bind(this);
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
