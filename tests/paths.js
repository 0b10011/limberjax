import { Selector } from 'testcafe';

const path = require("path");

// selectors
const title = Selector('h1');
const input = Selector('input[name=link]');
const mode_input = Selector('input[name=mode]');
const container_input = Selector('input[name=container]');
const method_input = Selector('input[name=method]');
const link = Selector('a#main-link');
const forward_link = Selector('a#forward-link');
const back_link = Selector('a#back-link');

fixture('limberjax')
  .page('http://localhost:3000/');

test('Basic navigation', async (t) => {
  await t
    .expect(title.innerText).eql('/')

		.typeText(input, "/foo", {replace: true})
		.click(link)
		.expect(title.innerText).match(/^\/foo\?limberjax=/, "First click")

		.typeText(input, "/bar", {replace: true})
		.click(link)
		.expect(title.innerText).match(/^\/bar\?limberjax=/, "Second click")

		.typeText(input, "/baz", {replace: true})
		.click(link)
		.expect(title.innerText).match(/^\/baz\?limberjax=/, "Third click")

		.typeText(input, "/foo?limberjax=bar", {replace: true})
		.click(link)
		.expect(title.innerText).match(/^\/foo\?limberjax=/, "limberjax set")
		.expect(title.innerText).notMatch(/limberjax=bar/, "limberjax overwrote single")

		.typeText(input, "/foo?limberjax=bar&limberjax=baz", {replace: true})
		.click(link)
		.expect(title.innerText).match(/^\/foo\?limberjax=/, "limberjax set on multiple")
		.expect(title.innerText).notMatch(/^limberjax=bar/, "limberjax overwrote first multiple")
		.expect(title.innerText).notMatch(/^limberjax=baz/, "limberjax overwrote second multiple");
});

test('Relative links', async (t) => {
  await t
    .expect(title.innerText).eql('/')

		.typeText(input, "/foo/bar", {replace: true})
		.click(link)
		.expect(title.innerText).match(/^\/foo\/bar\?limberjax=/, "Subfolders")

		.typeText(input, "./baz", {replace: true})
		.click(link)
		.expect(title.innerText).match(/^\/foo\/baz\?limberjax=/, "Same folder")

		.typeText(input, "../qux", {replace: true})
		.click(link)
		.expect(title.innerText).match(/^\/qux\?limberjax=/, "Up a folder")
});

test('History', async (t) => {
  await t
    .expect(title.innerText).eql('/')

		.typeText(input, "/foo/bar/", {replace: true})
		.click(link)
		.typeText(input, "../", {replace: true})
		.click(link)
		.expect(title.innerText).match(/^\/foo\/\?limberjax=/, "Navigation")

		.click(back_link)
		.expect(title.innerText).match(/^\/foo\/bar\/\?limberjax=/, "Back once")
		.click(back_link)
		.expect(title.innerText).match(/^\//, "Back twice")
		.click(forward_link)
		.expect(title.innerText).match(/^\/foo\/bar\/\?limberjax=/, "Forward once")
		.click(forward_link)
		.expect(title.innerText).match(/^\/foo\/\?limberjax=/, "Forward twice")
});

test('Container', async (t) => {
	const inner_wrapper = Selector("#inner-wrapper");
	const inner_container = Selector("#inner-container");
  await t
    .expect(title.innerText).eql('/')

		.typeText(input, "/foo", {replace: true})
		.typeText(container_input, "#inner-container", {replace: true})
		.click(link)
    .expect(title.innerText).eql('/')
		.expect(inner_container.child("h1").innerText).match(/^#inner-container: \/foo\?limberjax=/, "Appended")

		.typeText(input, "/bar", {replace: true})
		.typeText(mode_input, "append-after", {replace: true})
		.click(link)
    .expect(title.innerText).eql('/')
		.expect(inner_container.child("h1").innerText).match(/^#inner-container: \/foo\?limberjax=/, "Appended")
		.expect(inner_wrapper.child("h1").innerText).match(/^#inner-container: \/bar\?limberjax=/, "Appended")
});

test('Forms', async (t) => {
	const submit_input = Selector("input[type=submit]");
	const submit_button = Selector("button[type=submit]");
	const file_field = Selector("input[name=file]");
  await t
    .expect(title.innerText).eql('/')

		.typeText(input, "/foo", {replace: true})
		.typeText(method_input, "get", {replace: true})
		.click(submit_input)
    .expect(title.innerText).match(/^\/foo\?limberjax=.*&text=foo$/, "Submitted")

		.typeText(input, "/bar", {replace: true})
		.typeText(method_input, "post", {replace: true})
		.click(submit_button)
    .expect(title.innerText).match(/^\/bar\?limberjax=[^&]+ \(text:foo;\)$/, "Submitted")

		.setFilesToUpload(file_field, [
			path.join(__dirname, "../test-data/files/acid2.png"),
			path.join(__dirname, "../test-data/files/amelia-earhart.txt")
		])
		.click(submit_input)
    .expect(title.innerText).match(/^\/bar\?limberjax=[^&]+ \(text:foo;file:acid2.png\|7bit\|image\/png\|1253;file:amelia-earhart.txt\|7bit\|text\/plain\|238;\)$/, "Submitted")
});
