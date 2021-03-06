import Document from '../src/dom';
import test from './test';

test('Light DOM Implementation');

let code = '<html><head><meta charset="UTF-8"/><title>Mein Titel</title></head><body><link rel="zino-tag" data-local="test.html"/><test></test></body></html>';
let document = new Document('<!DOCTYPE html>' + code);

test('Can parse a document', t => {
	t.is(document.documentElement.outerHTML, code, 'parsed code');

	{
		let code = '<html lang="en"><head><title>Mein Titel</title></head><body><link rel="zino-tag" data-local="test.html"/><test></test></body></html>';
		document = new Document('<!DOCTYPE html>' + code);
		t.is(document.documentElement.getAttribute('lang'), 'en', 'correctly applies document element attributes');
	}
});

test('can parse document fragments', t => {
	let code = '<div class="Hallo">World!</div>';
	document = new Document(code);
	t.is(document.documentElement.outerHTML, '<html><head></head><body>' + code + '</body></html>', 'added it to correct position in DOM');
});

test('supports simple traversing features', t => {
	t.is(document.documentElement.children[0].parentNode, document.documentElement, 'supports children and parentNode');
	t.is(document.querySelectorAll('.Hallo').length, 1, 'supports querySelectorAll for classes');
	t.is(document.getElementsByClassName('Hallo').length, 1, 'supports getElementsByClassName');
	t.is(document.getElementsByTagName('body')[0], document.body, 'supports getElementsByTagName');
	t.is(document.getElementsByTagName('*').length, 4, 'getElementsByTagName can deal with *');
});

test('allows DOM modification', t => {
	let object = document.createElement('object');
	object.setAttribute('src', '/test.obj');
	document.body.appendChild(object);
	t.is(document.body.innerHTML, '<div class="Hallo">World!</div><object src="/test.obj"></object>', 'supports setAttribute and appendChild');
	t.is(document.body.children[0], document.querySelectorAll('.Hallo')[0], 'is sorted into correct position');
	document.body.removeChild(document.body.children[0]);
	t.is(document.body.innerHTML, '<object src="/test.obj"></object>', 'supports removeChild');
});

test('supports default child properties', t => {
	let code = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta http-equiv="x-ua-compatible" content="ie=edge"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>

<title></title>

<link href="favicon.ico" rel="shortcut icon"/>

<meta name="description" content="  global.storename"/>
<meta name="keywords" content="  global.storename"/>

<link rel="stylesheet" href="style.css"/>

<script type="text/javascript">//
</script><script type="text/javascript">//
</script>

<meta name="rqid" content="6T4rQfds1lUpSYoAgAK"/><link type="text/css" href="dynamic.css" rel="stylesheet" /></head>
<body><iframe src="/start" width="0px" height="0px"></iframe>

<h1>Headline</h1>



<link rel="zino-tag" data-local="components/example.html"/>
<example></example>



<script type="text/javascript" src="test.js"></script>
<script>
window.urls = {"test": "1234"};
</script>
<script type="text/javascript" src="main.js"></script>

</body>
</html>`;
	document = new Document(code);
	t.is(document.head, document.documentElement.children[0], 'head is defined');
	t.is(document.body, document.documentElement.children[1], 'body is defined');
	t.is(document.getElementsByTagName('example').length, 1, 'can find custom component');
	t.is(document.querySelectorAll('[rel="zino-tag"]').length, 1, 'can find zino link');
});

test('attribute access', t => {
	document = new Document('<div class="test" data-value="me">test</div>');
	t.is(document.getElementsByClassName('test')[0].getAttribute('data-value'), 'me', 'getAttribute returns correct value');
	t.is(document.getElementsByClassName('test')[0].attributes['data-value'].value, 'me', 'attributes array returns correct value');
	t.is(document.getElementsByClassName('test')[0].attributes[1].name, 'data-value', 'attributes array has numerical access');
	t.is(document.getElementsByClassName('test')[0].attributes[1].value, 'me', 'attributes array numerical access returns correct value');
	t.not(document.getElementsByClassName('test')[0].attributes['class'], 'test', 'attributes array does not directly provide access to value');
});

test('parsing speed', t => {
	let fs = require('fs');
	let code = fs.readFileSync('./test/test.html', 'utf-8');
	document = new Document(code);
});

test('can deal with broken innerHTML data', t => {
	document = new Document('<div></div>');
	t.throws(() => {
		document.body.children[0].innerHTML = '<test>1234<div><img src="test">test</div>Me';
	}, 'Unclosed tag test', 'correctly identifies the tag that has not been closed correctly.');
	t.is(document.body.innerHTML, '<div></div>');
});

test('element access', t => {
	document = new Document('<div id="t1" class="test" __ready="true"><i id="italic" __ready="true">huhu</i></div><div __ready="true" id="t2" class="test"><b __ready="true" id="bold"></b></div>');
	let ids = document.querySelectorAll('[__ready]').map(el => el.getAttribute('id')).join(',');
	t.is(ids, 't1,italic,t2,bold', 'finds all instances in correct order');
	t.is(document.getElementById('bold').outerHTML, '<b __ready="true" id="bold"></b>');
});

test('is able to parse custom self-closing tags', t => {
	Document.options.customSelfClosingTags = /is(?:else|set)/
	document = new Document('<isobject type="test"><isset name="kdans" value="${paso}">test<isif condition="${true}">test<iselse>other test</isif></isobject>');
	t.is(document.querySelectorAll('isset').length, 1, 'finds the element');
	t.is(document.querySelectorAll('isset')[0].innerHTML, '', 'does not have a body')
	t.is(document.querySelectorAll('isif iselse').length, 1);
	t.is(document.querySelectorAll('iselse')[0].innerHTML, '');
	t.is(document.querySelectorAll('isif')[0].innerHTML, 'test<iselse/>other test');
});

test('can deal with attribute values that contain a > character', t => {
	const html = `<xyz><div class="approaching-discounts">
        <isif condition="\${pdict.approachingDiscounts.length > 0}">
                <isloop items="\${pdict.approachingDiscounts}" var="approachingDiscount">
                    <div class="single-approaching-discount text-center">
                    \${approachingDiscount.discountMsg}
                    </div>
                </isloop>
        </isif>
</div>
</xyz>`;
	document = new Document(html);
	t.is(document.querySelectorAll('xyz').length, 1, 'can parse it');
	t.is(document.body.innerHTML, html, 'innerHTML is the same as input');
	t.is(document.querySelectorAll('[items]').length, 1);
});

test('can simulate events', t => {
	let triggered = false;
	let document = new Document('<div></div>');
	document.body.addEventListener('click', function (event) {
		triggered = true;
	});
	document.body.click();
	t.is(triggered, true, 'event was triggered');

	document.documentElement.addEventListener('click', function (event) {
		triggered = false;
	});
	document.body.click();
	t.is(triggered, false, 'event bubbles up');

	document.documentElement.removeEventListener('click');
	document.body.click();
	t.is(triggered, true, 'event removal works');

	document.body.removeEventListener('click');
	triggered = false;
	document.body.addEventListener('click', function (event) {
		event.preventDefault();
		triggered = 1;
	});

	document.body.addEventListener('click', function (event) {
		triggered = 2;
	});

	document.documentElement.addEventListener('click', function (event) {
		triggered = 3;
	});

	document.body.click();
	t.is(triggered, 1, 'preventDefault can be executed on the event and cancels the event');
	document.body.removeEventListener('click');
	document.documentElement.removeEventListener('click');

	triggered = false;
	document.body.addEventListener('click', function (event) {
		event.stopPropagation();
		triggered = 1;
	});

	document.body.addEventListener('click', function (event) {
		triggered = 2;
	});

	document.documentElement.addEventListener('click', function (event) {
		triggered = 3;
	});
	document.body.click();
	t.is(triggered, 2, 'stopPropagation cancels bubbling');
});
