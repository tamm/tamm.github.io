# tamm.github.io

[![Static Site Generation from Remix with wget](https://github.com/tamm/tamm.github.io/actions/workflows/main.yml/badge.svg)](https://github.com/tamm/tamm.github.io/actions/workflows/main.yml)
I built this using [The Remix Indie Stack](https://repository-images.githubusercontent.com/465928257/a241fa49-bd4d-485a-a2a5-5cb8e4ee0abf)

You might also see this repo as an example of how to set up a static site generator using Remix.run, although except for this experimental purpose I'm not sure I can recommend you do that at all ☺️

## Quickstart

Start the project locally

```
yarn
yarn dev
```

Build static site assets

```
yarn
yarn build
```

Check ./static

### Connecting to your database

The sqlite database lives at `/data/sqlite.db` in your deployed application. You can connect to the live database by running `fly ssh console -C database-cli`.

## Testing

### Cypress

We use Cypress for our End-to-End tests in this project. You'll find those in the `cypress` directory. As you make changes, add to an existing file or create a new file in the `cypress/e2e` directory to test your changes.

We use [`@testing-library/cypress`](https://testing-library.com/cypress) for selecting elements on the page semantically.

To run these tests in development, run `yarn test:e2e:dev` which will start the dev server for the app as well as the Cypress client. Make sure the database is running in docker as described above.

### Vitest

For lower level tests of utilities and individual components, we use `vitest`. We have DOM-specific assertion helpers via [`@testing-library/jest-dom`](https://testing-library.com/jest-dom).

### Type Checking

This project uses TypeScript. It's recommended to get TypeScript set up for your editor to get a really great in-editor experience with type checking and auto-complete. To run type checking across the whole project, run `yarn typecheck`.

### Linting

This project uses ESLint for linting. That is configured in `.eslintrc.js`.

### Formatting

We use [Prettier](https://prettier.io/) for auto-formatting in this project. It's recommended to install an editor plugin (like the [VSCode Prettier plugin](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)) to get auto-formatting on save. There's also a `yarn format` script you can run to format all files in the project.

### Spellchecking

I used cspell to make sure you don't commit any unintentional spelling mistakes. If you want to just tell it to shut up I included a script to add all unknown words to the custom dictionary.

```
yarn spellcheck
```

```
yarn spellcheck:add-unknown-words-to-custom-dictionary
```
