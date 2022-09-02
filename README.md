# hypnobots

🤖 Repo automation bots for noobs

## Available bots

| Name | Description | Install |
| ---- | ----------- | ------- |
| [auto-review](https://github.com/p3ol/hypnobots/tree/master/bots/auto-review) | Checks for any `CODEOWNERS` file or repo admins to automatically request a review when a PR is opened | [install](https://github.com/apps/auto-review) |
| [auto-update](https://github.com/p3ol/hypnobots/tree/master/bots/auto-update) | Checks for changes from the default branch to automatically update branches with active pull requests | [install](https://github.com/apps/auto-update-cop) |
| [naming-cop](https://github.com/p3ol/hypnobots/tree/master/bots/naming-cop) | PR checker that ensures the commit messages follow conventionalcommits.org style, as well as PR & branch titles | [install](https://github.com/apps/naming-cop) |
| [repro-cop](https://github.com/p3ol/hypnobots/tree/master/bots/repro-cop) | Checks for any existing repro link in an issue and reminds user to create one | [install](https://github.com/apps/repro-cop) |
| [review-app-generator](https://github.com/p3ol/hypnobots/tree/master/bots/review-app-generator) | Automatically creates a review app on heroku for a PR | [install](https://github.com/apps/review-app-generator) |
| [service-deploy-cop](https://github.com/p3ol/hypnobots/tree/master/bots/service-deploy-cop) | Checks commit history on a PR to determine services to redeploy | [install](https://github.com/apps/service-deploy-cop) |

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

## Contributing

[![](https://contrib.rocks/image?repo=p3ol/hypnobots)](https://github.com/p3ol/hypnobots/graphs/contributors)

Please check the [CONTRIBUTING.md](https://github.com/p3ol/hypnobots/blob/master/CONTRIBUTING.md) doc for contribution guidelines.

## License

This software is licensed under [MIT](https://github.com/p3ol/hypnobots/blob/master/LICENSE).
