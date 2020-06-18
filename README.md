# hypnobots

🤖 Repo automation bots for noobs

## Available bots

| Name | Description | Install |
| ---- | ----------- | ------- |
| [auto-review](https://github.com/p3ol/hypnobots/tree/master/bots/auto-review) | Checks for any `CODEOWNERS` file or repo admins to automatically request a review when a PR is opened | [install](https://github.com/apps/auto-review) |
| [auto-update](https://github.com/p3ol/hypnobots/tree/master/bots/auto-update) | Checks for changes from the default branch to automatically update branches with active pull requests | [install](https://github.com/apps/auto-update-cop) |
| [naming-cop](https://github.com/p3ol/hypnobots/tree/master/bots/naming-cop) | PR checker that ensures the commit messages follow conventionalcommits.org style, as well as PR & branch titles | [install](https://github.com/apps/naming-cop) |
| [repro-cop](https://github.com/p3ol/hypnobots/tree/master/bots/repro-cop) | Checks for any existing repro link in an issue and reminds user to create one | [install](https://github.com/apps/repro-cop) |

## Contributing

Please check the [CONTRIBUTING.md](https://github.com/p3ol/hypnobots/blob/master/CONTRIBUTING.md) doc for contribution guidelines.

## Development

Install dependencies:

```bash
yarn install
```

Configure your probot environment within your current profile:

```
export APP_ID=xxxxx
export PRIVATE_KEY_PATH=/path/to/your/private/key.pem
export WEBHOOK_PROXY_URL=https://smee.io/your-custom-proxy
export WEBHOOK_SECRET=your-secret
```

Run any bot using:

```bash
yarn serve bots/naming-cop
```

And test your code:

```bash
yarn test
```

## License

This software is licensed under [MIT](https://github.com/p3ol/hypnobots/blob/master/LICENSE).

## Contributors

<!-- Contributors START
Ugo_Stephant dackmin https://ugostephant.io doc tools
Paul_Beauduc Acerlorion https://github.com/Acerlorion code
<!-- Contributors END -->
<!-- Contributors table START -->
| <img src="https://avatars.githubusercontent.com/dackmin?s=100" width="100" alt="Ugo Stephant" /><br />[<sub>Ugo Stephant</sub>](https://github.com/dackmin)<br />[📖](https://github.com/p3ol/hypnobots/commits?author=dackmin) 🔧 | <img src="https://avatars.githubusercontent.com/Acerlorion?s=100" width="100" alt="Paul Beauduc" /><br />[<sub>Paul Beauduc</sub>](https://github.com/Acerlorion)<br />[💻](https://github.com/p3ol/hypnobots/commits?author=Acerlorion) |
| :---: | :---: |
<!-- Contributors table END -->
