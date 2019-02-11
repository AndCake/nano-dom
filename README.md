# nano-dom

A light DOM implementation that can be used to test DOM modification on the server-side. This package contains a simple HTML parser to convert the HTML source code to a DOM structure. It provides only the most basic DOM API to be still useful.

Installation
------------

```
$ npm i nano-dom -D
```

Usage
-----

```js
import Document from 'nano-dom';

const document = new Document('<div class="greeting">Hello world!</div>');

console.log(document.querySelector('.greeting').innerHTML); // Hello world!
```

Support for custom tags
-----------------------

You can configure which custom tags are allowed to be self-closing ones. If not configured, you may have to close them explicitly.

```js
import { options }, Document from 'nano-dom';

options.customSelfClosingTags = ['chicken', 'run'];

const document = new Document(`
    <div class="yard">
        <chicken name="Prillan"/>
        <my-non-self-closing>text content</my-non-self-closing>
        <run speed="fast"/>
    </div>
`);

```

Supported DOM API
-----------------

* DOMText
* DOMElement
  - childNodes
  - children
  - nodeName
  - nodeType
  - tagName
  - className
  - classList
  - firstElementChild
  - innerHTML
  - outerHTML
  - appendChild()
  - replaceChild()
  - removeChild()
  - remove()
  - setAttribute()
  - removeAttribute()
  - getAttribute()
  - addEventListener()
  - removeEventListener()
  - dispatchEvent()
  - getElementByTagName()
  - getElementByClassName()
  - getElementById()
  - querySelectorAll()
  - querySelector()
  - click()
  - focus()
  - blur()
* Document
  - documentElement
  - childNodes
  - children
  - nodeType
  - body
  - head
  - createElement()
  - createTextNode()
  - getElementById()
  - getElementsByTagName()
  - getElementsByClassName()
  - querySelectorAll()
  - querySelector()
  - addEventListener()
  - removeEventListener()
