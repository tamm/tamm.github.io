---
title: "Publish to GitHub Packages using Actions and Changesets"
description: "A guide to publishing packages to GitHub Packages (GPR) via GitHub Actions with Changesets, including workarounds for common authentication issues."
pubDate: 2023-01-06
tags: ["github", "ci-cd", "npm", "changesets"]
---

Can I publish from a GitHub Action to GitHub Packages using Changesets? Yes and no.

If the question is just asked around overall using the `changeset` command `changeset publish` in order to publish your packages to GitHub Packages, yes you can. There is a bit of a clue to how in [issue #287 in the changeset repo](https://github.com/changesets/changesets/issues/287), which mentions that you need to make sure to configure your destination correctly:

```json
"publishConfig": {
    "registry": "https://npm.pkg.github.com"
},
"repository": {
    "type": "git",
    "url": "ssh://git@github.com/user/repo.git",
    "directory": "packages/package-name"
}
```

You need this **per package** if you use a monorepo like lerna, turborepo or nx.

In order to run in GitHub actions you might need to ensure there is a `.npmrc` with your `GITHUB_TOKEN` set up for auth against the GitHub Packages registry, something you can do by adding a step like this:

```yaml
- name: Creating .npmrc
  run: |
    cat << EOF > "$HOME/.npmrc"
      //npm.pkg.github.com/:_authToken=$NPM_TOKEN
    EOF
  env:
    NPM_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

A lot of instructions seem to then suggest that you use the changeset action

```yaml
      - name: Create Release Pull Request or Publish to npm
        id: changesets
        uses: changesets/action@v1
```

However if you use that you will run into an issue where that action overrides your auth from that `.npmrc` because it only [tries to verify that you have a token for the npmjs.org registry](https://github.com/changesets/action/blob/main/src/index.ts#L64).

This is super helpful if you're trying to publish public packages or are using the private npmjs.org features but if you're paying for GitHub Packages anyway you might want to use that instead. So what can you do?

There are a few GitHub issues talking about this being tricky
* https://github.com/changesets/action/issues/52
* https://github.com/changesets/action/issues/178

And a PR to fix this: https://github.com/changesets/action/pull/219

But I wanted to get this working today so what can you do? **Skip the publishing part!**

[Custom publishing](https://github.com/changesets/action#custom-publishing) is actually part of the documentation, but this use-case isn't really mentioned.

Start with making sure your changeset action doesn't include the `with: publish: yarn release` or similar command you might have been instructed to add. This way if you have changes to be published you can DIY.

Then set up your own separate publish step:

```yaml
      - name: Publish
        if: steps.changesets.outputs.hasChangesets == 'false'
        # You can do something when a publish should happen.
        run: yarn publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This will run if your changeset action is in a state of "would have published if there was a command".

Now you can expect your publish action to work with GPR, but it won't have all the benefits from the changeset action. I also haven't attempted to publish packages to both GPR and NPM this way, but you should be able to.

One last thing, if you get a 403 you need to fix your GitHub permissions, you've got things right and just need to go to the package settings and enable your repo's actions to publish to the package.

I found this at `https://github.com/orgs/[my-org]/packages/npm/[package-name]/settings`, but if you want the click by click go to your Org page, then click Packages, select your package, look for Package settings at the bottom of the right column and add a write permission for your repo under "Manage Actions access".
