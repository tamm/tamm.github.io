---
title: "How volatile is TypeScript?"
description: "An exploration of TypeScript's stability, evolution, and what developers should know about its type system in 2022."
pubDate: 2022-10-26
tags: ["typescript", "javascript", "programming"]
ogPrompt: "A seismograph-style squiggly line running across the image, like measuring volatility/stability. The word 'volatile' in the title should be underlined. The squiggly line should drift off both edges of the image. Maybe include a tiny sketched TypeScript logo. Very minimal, loose hand-drawn lines."
---

I recently got asked the question "How volatile is TypeScript?" and figured I'd write down my thoughts on the matter in 2022.

My answer splits into sections to make my answer easier to read, and answer some specific parts to the question.

## The TLDR; answer

It is not very volatile. I'm however keen to get you digging much further into this, dear reader! Come with me down this rabbit hole!

## How has TypeScript evolved with things like arrow functions?

TypeScript introduced Arrow functions, or Fat Arrows, or Lambda functions, in 2014 in order to enable them for early adopters before the ECMAScript spec included it officially and before browsers supported it natively. The oldest version in the GitHub repo is [v1.1](https://github.com/microsoft/TypeScript/tree/v1.1), which contains support for arrow functions as a transpilation.

Documentation from that release states:

> Function expressions are extended from JavaScript to optionally include parameter and return type annotations, and a new compact form, called arrow function expressions, is introduced.

This was perhaps not 100% safe to use long term as the spec *could* change before official support in ECMAScript, but that [came in the 2015 spec](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-arrow-function-definitions) and TypeScript aligned closely since that was [based on the draft](https://tc39wiki.calculist.org/es6/arrow-functions/).

Basing the implementation of drafts of ECMAScript is the standard way to propose new features in TypeScript.

### Further related reading:

[How to use arrow functions and why they exist](https://johnrusch.medium.com/how-to-use-arrow-functions-and-why-they-exist-8510067aa4ef)

[typescript-book/arrow-functions.md](https://github.com/basarat/typescript-book/blob/master/docs/arrow-functions.md)

## It's some structure on top of ECMA, right?

> [TypeScript](https://www.typescriptlang.org/) is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale.

TypeScript is a superset of ECMAScript, with a compiler that transpiles any not-yet-officially-supported and not-very-well-supported-in-modern-browsers features to older syntax to make the most up-to-date ECMAScript spec available to developers today.

It also adds tooling such as the Type in the name, which allows developers to work more efficiently at scale, making sure that teams find it easier to stay consistent and avoid errors at as early a stage as possible. The time savings of TypeScript can primarily be described as compile-time error detection and while-typing-error-detection, meaning that developers do not need to wait until their build finishes or tests run to find out they *may* have made a mistake before it even becomes one.

When TypeScript is compiled, it is just JS running as usual (unless you opted for the live-run mode), but it adds so much to the developer experience before it compiles.

## Are those changes pretty much stable now?

They've always been quite stable, and the upgrade strategy of TypeScript has been to avoid breaking changes in any non-major version releases.

Even in the 4.0 release, there were [no major breaking changes announced](https://devblogs.microsoft.com/typescript/announcing-typescript-4-0/).

There's a fairly detailed log of the actual breaking changes, and if you dig into them, you will soon notice that most of them are about reducing the possibility of making mistakes (somewhat opinionated, but mostly based on newer specs).

For example, the latest breaking change related to arrow functions happened in 1.5 [Referencing arguments in arrow functions is not allowed](https://github.com/microsoft/TypeScript/wiki/Breaking-Changes#referencing-arguments-in-arrow-functions-is-not-allowed), which aligns TypeScript with [ES6 spec draft 9.2.12](http://wiki.ecmascript.org/doku.php?id=harmony:specification_drafts).

## So, how volatile is it today?

Since I personally started using TypeScript in 2014, I have yet to experience TypeScript actually breaking anything, you can update your TypeScript version without bumping packages dependent on it almost always.

The only times I have seen trouble with this has been when NX refuses to use a newer version of compilers unless you upgrade NX, and NX was always at least 6-12 months behind at the time. This is an example and not unique to NX; other build kits/frameworks will have similar issues unless they have very little opinion about how you compile your code. Rollup, babel, etc., need to be allowed to be bumped to the latest version to support the latest TypeScript, more often than the other way around.

## Digging just a little deeper!

Okay, so I said TypeScript become JS when you compile it, but what does that MEAN for the code?

I'd suggest you take in what you can from [this TS Playground](https://www.typescriptlang.org/play?q=210#example/structural-typing) how TypeScript's Structural Type system works, as it will show you in the compiled version what JS is output when you use types on the TypeScript side.

If you read through the code comments and play around with that code you might have a bit more of an understanding of how TypeScript creates what you might call "strict" typing, but only *at dev/compile/build-time*. Once your code is run as JS in a browser, you still do not have *run-time* types. This means the most volatile part of TypeScript comes into play for **developers who do not know how to create Type Guards**.

[What's a Type Guard?](https://www.typescriptlang.org/play?q=26#example/type-guards) You probably wrote something like it plenty of times in the past; you might say it is a protection against attempting to access unsafe data at run-time. There's more on the topic in [this other playground about Type Guards](https://www.typescriptlang.org/play?q=26#example/type-guards).

A very simple example of this in JS could look like

```javascript
const brokenDTOFromAPI = { b: 1 };

const responseHandlerForAPIEndpoint = (dto) => {
  if (!dto?.a?.first || typeof dto.a.first !== "string") { return; }

  console.log(`All good, got "${dto.a.first}" from API`);
}

responseHandlerForAPIEndpoint(brokenDTOFromAPI);
```

As you can see, this will result in a no-op since the API responded with something that does not match our guard statement. In a real-world scenario, the return might be a `throw`, and error handling might happen elsewhere, but the run-time error of accessing an undefined property was avoided, as well as any unable-to-convert-to-string or bad convert-to-string problems were avoided.

This could be prevented to some degree using linting or a [Danger.js](https://danger.systems/js/) script to check for appropriate levels of Type Guards but remains the single point of concern for me as it depends on a human being making the right choices.
