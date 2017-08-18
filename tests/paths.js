/* global fixture, test */

import { Selector } from 'testcafe'

const path = require('path')

// selectors
const title = Selector('h1')
const input = Selector('input[name=link]')
const modeInput = Selector('input[name=mode]')
const containerInput = Selector('input[name=container]')
const methodInput = Selector('input[name=method]')
const link = Selector('a#main-link')
const forwardLink = Selector('a#forward-link')
const backLink = Selector('a#back-link')

fixture('limberjax')
  .page('http://localhost:3000/')

test('Basic navigation', async (t) => {
  await t
    .expect(title.innerText).eql('/')

    .typeText(input, '/foo', {replace: true})
    .click(link)
    .expect(title.innerText).match(/^\/foo\?limberjax=/, 'First click')

    .typeText(input, '/bar', {replace: true})
    .click(link)
    .expect(title.innerText).match(/^\/bar\?limberjax=/, 'Second click')

    .typeText(input, '/baz', {replace: true})
    .click(link)
    .expect(title.innerText).match(/^\/baz\?limberjax=/, 'Third click')

    .typeText(input, '/foo?limberjax=bar', {replace: true})
    .click(link)
    .expect(title.innerText).match(/^\/foo\?limberjax=/, 'limberjax set')
    .expect(title.innerText).notMatch(/limberjax=bar/, 'limberjax overwrote single')

    .typeText(input, '/foo?limberjax=bar&limberjax=baz', {replace: true})
    .click(link)
    .expect(title.innerText).match(/^\/foo\?limberjax=/, 'limberjax set on multiple')
    .expect(title.innerText).notMatch(/^limberjax=bar/, 'limberjax overwrote first multiple')
    .expect(title.innerText).notMatch(/^limberjax=baz/, 'limberjax overwrote second multiple')
})

test('Relative links', async (t) => {
  await t
    .expect(title.innerText).eql('/')

    .typeText(input, '/foo/bar', {replace: true})
    .click(link)
    .expect(title.innerText).match(/^\/foo\/bar\?limberjax=/, 'Subfolders')

    .typeText(input, './baz', {replace: true})
    .click(link)
    .expect(title.innerText).match(/^\/foo\/baz\?limberjax=/, 'Same folder')

    .typeText(input, '../qux', {replace: true})
    .click(link)
    .expect(title.innerText).match(/^\/qux\?limberjax=/, 'Up a folder')
})

test('History', async (t) => {
  await t
    .expect(title.innerText).eql('/')

    .typeText(input, '/foo/bar/', {replace: true})
    .click(link)
    .typeText(input, '../', {replace: true})
    .click(link)
    .expect(title.innerText).match(/^\/foo\/\?limberjax=/, 'Navigation')

    .click(backLink)
    .expect(title.innerText).match(/^\/foo\/bar\/\?limberjax=/, 'Back once')
    .click(backLink)
    .expect(title.innerText).match(/^\//, 'Back twice')
    .click(forwardLink)
    .expect(title.innerText).match(/^\/foo\/bar\/\?limberjax=/, 'Forward once')
    .click(forwardLink)
    .expect(title.innerText).match(/^\/foo\/\?limberjax=/, 'Forward twice')
})

test('Container', async (t) => {
  const innerWrapper = Selector('#inner-wrapper')
  const innerContainer = Selector('#inner-container')
  await t
    .expect(title.innerText).eql('/')

    .typeText(input, '/foo', {replace: true})
    .typeText(containerInput, '#inner-container', {replace: true})
    .click(link)
    .expect(title.innerText).eql('/')
    .expect(innerContainer.child('h1').innerText).match(/^#inner-container: \/foo\?limberjax=/, 'Appended')

    .typeText(input, '/bar', {replace: true})
    .typeText(modeInput, 'append-after', {replace: true})
    .click(link)
    .expect(title.innerText).eql('/')
    .expect(innerContainer.child('h1').innerText).match(/^#inner-container: \/foo\?limberjax=/, 'Appended')
    .expect(innerWrapper.child('h1').innerText).match(/^#inner-container: \/bar\?limberjax=/, 'Appended')
})

test('Forms', async (t) => {
  const submitInput = Selector('input[type=submit]')
  const submitButton = Selector('button[type=submit]')
  const fileField = Selector('input[name=file]')
  await t
    .expect(title.innerText).eql('/')

    .typeText(input, '/foo', {replace: true})
    .typeText(methodInput, 'get', {replace: true})
    .click(submitInput)
    .expect(title.innerText).match(/^\/foo\?limberjax=.*&text=foo$/, 'Submitted')

    .typeText(input, '/bar', {replace: true})
    .typeText(methodInput, 'post', {replace: true})
    .click(submitButton)
    .expect(title.innerText).match(/^\/bar\?limberjax=[^&]+ \(text:foo;\)$/, 'Submitted')

    .setFilesToUpload(fileField, [
      path.join(__dirname, '../test-data/files/acid2.png'),
      path.join(__dirname, '../test-data/files/amelia-earhart.txt')
    ])
    .click(submitInput)
    .expect(title.innerText).match(/^\/bar\?limberjax=[^&]+ \(text:foo;file:acid2.png\|7bit\|image\/png\|1253;file:amelia-earhart.txt\|7bit\|text\/plain\|238;\)$/, 'Submitted')
})

test('Version', async (t) => {
  const submit = Selector('button[type=submit]')

  await t
    .navigateTo('/bad-version')
    .typeText(input, '/foo?bar=baz', {replace: true})
    .click(link)
    .expect(title.innerText).eql('/foo?bar=baz', 'Retried link')

    .navigateTo('/bad-version')
    .typeText(input, '/foo', {replace: true})
    .click(submit)
    .expect(title.innerText).eql('/foo?text=foo&file=', 'Retried GET')

    .navigateTo('/bad-version')
    .typeText(input, '/foo', {replace: true})
    .typeText(methodInput, 'post', {replace: true})
    .click(submit)
    .expect(title.innerText).eql('/foo (text:foo;)', 'Retried POST')
})

test.only('Scroll', async (t) => {
  const positionedDiv = Selector('#positionedDiv')
  const x = Selector('#x')
  const y = Selector('#y')

  await t
    .resizeWindow(1000, 1000)
    .expect(x.innerText).eql('0')
    .expect(y.innerText).eql('0')
    .typeText(input, '/foo', {replace: true})

  await t
    .click(positionedDiv)
    .expect(x.innerText).eql('20')
    .expect(y.innerText).eql('20')

    .click(link)
    .expect(title.innerText).match(/^\/foo\?limberjax=/)
    .expect(x.innerText).eql('0')
    .expect(y.innerText).eql('0')

    .click(backLink)
    .expect(title.innerText).eql('/')
//    .expect(x.innerText).eql('20') // Works in browsers but not testcafe
    .expect(y.innerText).eql('20')

    .click(forwardLink)
    .expect(title.innerText).match(/^\/foo\?limberjax=/)
    .expect(x.innerText).eql('0')
    .expect(y.innerText).eql('0')
})
