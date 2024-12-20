<div id="top"></div>
<div align="center">

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![Wiki][wiki-shield]][wiki-url]

</div>

<br />
<div align="center">
  <a href="https://github.com/metakgp/iqps">
    <img width="140" alt="image" src="https://raw.githubusercontent.com/metakgp/design/main/logos/black-large.jpg">
  </a>

  <h3 align="center">IQPS</h3>

  <p align="center">
    <i>Intelligent Question Paper Search</i>
    <br />
    <a href="https://qp.metakgp.org">Website</a>
    ·
    <a href="https://github.com/metakgp/iqps-go/issues">Report Bug / Request Feature</a>
    ·
    <a href="https://metakgp.github.io/iqps-go/iqps_backend/">Backend Documentation</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
<summary>Table of Contents</summary>

- [About The Project](#about-the-project)
- [Development](#development)
- [Deployment](#deployment)
  - [Environment Variables](#environment-variables)
- [Contact](#contact)
  - [Maintainer(s)](#maintainers)
  - [Creator(s)](#creators)
- [Additional documentation](#additional-documentation)

</details>

## About The Project
<div align="center">
  <img width="60%" alt="image" src="./frontend/public/banner.png">
</div>

IQPS is a platform for searching and uploading previous year question papers for IIT Kharagpur students. The frontend is deployed at https://qp.metakgp.org and the backend is hosted on a DigitalOcean droplet with 2GB RAM and a single CPU. See [MetaPloy](https://github.com/metakgp/metaploy) for the deployment architecture.
IQPS was originally created by [Shubham Mishra](https://github.com/grapheo12) in python. You can find it [here](https://github.com/grapheo12/iqps).

> [!Note]
> Currently in active development. Get involved at our [Slack](https://slack.metakgp.org/).

## Development
1. Clone this repository.
2. For starting the backend:
    - Change directory to backend `cd backend`
    - Make the env file by copying the template: `cp .env.template .env`
    - Fill the env variable and set `DB_HOST=localhost` for running locally for development
    - Start the DB by running `docker compose -f docker-compose.dev.yaml up -d`
    - Start the Rust backend by running `cargo run .`
3. Set up the frontend by running `pnpm install` and then `pnpm start` in the `frontend/` directory.
4. Profit.

### Crawler
[WIP: Steps to locally set up crawler]

## Deployment
### Backend
0. Set up [MetaPloy](https://github.com/metakgp/metaploy) **for production**.
1. Clone this repository at a convenient location such as `/deployments`.
2. `cd backend/`
3. Set the appropriate **production** [environment variables](#environment-variables) in the `.env` file.
4. Run `docker compose up` to start the backend.
5. Optionally set up a Systemd service to start the wiki on startup or use this [deployment github workflow](./.github/workflows/deploy.yaml).

### Environment Variables
Environment variables can be set using a `.env` file. Use the `.env.template` files for reference. See `backend/src/env.rs` for more documentation and types.

#### Backend
##### Database (Postgres)
- `DB_NAME`: Database name
- `DB_HOST`: Database hostname (eg: `localhost`)
- `DB_PORT`: Database port
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password

##### Authentication
- `GH_CLIENT_ID`: Client ID of the Github OAuth app.
- `GH_CLIENT_SECRET`: Client secret of the Github OAuth app.
- `GH_ORG_NAME`: The name of the Github organization of the admins.
- `GH_ORG_TEAM_SLUG`: The URL slug of the Github org team of the admins.
- `JWT_SECRET`: A secret key/password for JWT signing. It should be a long, random, unguessable string.

##### Configuration
- `MAX_UPLOAD_LIMIT`: Maximum number of files that can be uploaded at once.
- `LOG_LOCATION`: The path to a local logfile.
- `STATIC_FILES_URL`: The URL of the static files server. (eg: `https://static.metakgp.org`)
- `STATIC_FILE_STORAGE_LOCATION`: The path to the local directory from which the static files are served.
- `UPLOADED_QPS_PATH`: A path relative to `STATIC_FILE_STORAGE_LOCATION` where the uploaded question papers will be stored. (eg: `iqps/uploaded`)
- `LIBRARY_QPS_PATH`: A path relative to `STATIC_FILE_STORAGE_LOCATION` where the library question papers are scraped and stored. (eg: `peqp/qp`)
- `SERVER_PORT`: The port on which the server listens.
- `CORS_ALLOWED_ORIGINS`: A comma (,) separated list of origins to be allowed in CORS.

#### Frontend
- `VITE_BACKEND_URL`: The IQPS backend URL. Use `http://localhost:8080` in development.
- `VITE_MAX_UPLOAD_LIMIT` The maximum number of files that can be uploaded at once. (Note: This is only a client-side limit)
- `VITE_GH_OAUTH_CLIENT_ID` The Client ID of the Github OAuth app.


## Contact

<p>
📫 MetaKGP -
<a href="https://bit.ly/metakgp-slack">
  <img align="center" alt="Metakgp's slack invite" width="22px" src="https://raw.githubusercontent.com/edent/SuperTinyIcons/master/images/svg/slack.svg" />
</a>
<a href="mailto:metakgp@gmail.com">
  <img align="center" alt="Metakgp's email " width="22px" src="https://raw.githubusercontent.com/edent/SuperTinyIcons/master/images/svg/gmail.svg" />
</a>
<a href="https://www.facebook.com/metakgp">
  <img align="center" alt="metakgp's Facebook" width="22px" src="https://raw.githubusercontent.com/edent/SuperTinyIcons/master/images/svg/facebook.svg" />
</a>
<a href="https://www.linkedin.com/company/metakgp-org/">
  <img align="center" alt="metakgp's LinkedIn" width="22px" src="https://raw.githubusercontent.com/edent/SuperTinyIcons/master/images/svg/linkedin.svg" />
</a>
<a href="https://twitter.com/metakgp">
  <img align="center" alt="metakgp's Twitter " width="22px" src="https://raw.githubusercontent.com/edent/SuperTinyIcons/master/images/svg/twitter.svg" />
</a>
<a href="https://www.instagram.com/metakgp_/">
  <img align="center" alt="metakgp's Instagram" width="22px" src="https://raw.githubusercontent.com/edent/SuperTinyIcons/master/images/svg/instagram.svg" />
</a>
</p>

### Maintainer(s)

The currently active maintainer(s) of this project.

- [Rajiv Harlalka](https://github.com/rajivharlalka)
- [Arpit Bhardwaj](https://github.com/proffapt)
- [Harsh Khandeparkar](https://github.com/harshkhandeparkar)

### Creator(s)

Honoring the original creator(s) and ideator(s) of this project.

- [Shubham Mishra](https://github.com/grapheo12)

<p align="right">(<a href="#top">back to top</a>)</p>

## Additional documentation

- [License](/LICENSE)
- [Code of Conduct](/.github/CODE_OF_CONDUCT.md)
- [Security Policy](/.github/SECURITY.md)
- [Contribution Guidelines](/.github/CONTRIBUTING.md)

<p align="right">(<a href="#top">back to top</a>)</p>

[contributors-shield]: https://img.shields.io/github/contributors/metakgp/iqps-go.svg?style=for-the-badge
[contributors-url]: https://github.com/metakgp/iqps-go/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/metakgp/iqps-go.svg?style=for-the-badge
[forks-url]: https://github.com/metakgp/iqps-go/network/members
[stars-shield]: https://img.shields.io/github/stars/metakgp/iqps-go.svg?style=for-the-badge
[stars-url]: https://github.com/metakgp/iqps-go/stargazers
[issues-shield]: https://img.shields.io/github/issues/metakgp/iqps-go.svg?style=for-the-badge
[issues-url]: https://github.com/metakgp/iqps-go/issues
[license-shield]: https://img.shields.io/github/license/metakgp/iqps-go.svg?style=for-the-badge
[license-url]: https://github.com/metakgp/iqps-go/blob/master/LICENSE
[wiki-shield]: https://custom-icon-badges.demolab.com/badge/metakgp_wiki-grey?logo=metakgp_logo&style=for-the-badge
[wiki-url]: https://wiki.metakgp.org
