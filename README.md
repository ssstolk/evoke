<p align="center" style="padding-top:2em">
  <a href="http://evoke.ullet.net/">
    <img alt="Evoke" src="https://raw.githubusercontent.com/ssstolk/evoke/master/static/img/evoke.svg" width="200" />
  </a>
</p>

<p align="center">
  <i>Exploring vocabularies and the concepts their words evoke</i>
</p>

## About

The web application Evoke offers functionality to navigate, view, extend, and
analyse thesaurus content. The thesauri that can be navigated in Evoke are
expressed in Linguistic Linked Data, an interoperable data form that enables the
extension of thesaurus content with custom labels and allows for the linking of
thesaurus content to other digital resources. As such, Evoke is a powerful
research tool that facilitates its users to perform novel cultural linguistic
analyses over multiple sources. The functionality and architecture of Evoke are
discussed in an [academic article](https://doi.org/10.1163/18756719-12340235). 
Other articles published in the same [special issue](https://brill.com/view/journals/abag/81/3-4/abag.81.issue-3-4.xml) 
describe research that utilize Evoke. An instance of Evoke has been deployed at 
[http://evoke.ullet.net](http://evoke.ullet.net).

## Cite

If you are using or extending Evoke as part of a scientific publication,
we would appreciate a citation of the following [article](https://doi.org/10.1163/18756719-12340235).

```bibtex
@article { Evoke,
      author = "Sander Stolk",
      title = "Evoke: Exploring and Extending A Thesaurus of Old English Using a Linked Data Approach",
      journal = "Amsterdamer Beiträge zur älteren Germanistik",
      year = "2021",
      publisher = "Brill",
      address = "Leiden, The Netherlands",
      volume = "81",
      number = "3-4",
      doi = "https://doi.org/10.1163/18756719-12340235",
      pages = "318 - 358",
      url = "https://brill.com/view/journals/abag/81/3-4/article-p318_3.xml"
}
```

## Getting Started

These are the fundamental technologies used in the infrastructure of the application:
* [Typescript](https://www.typescriptlang.org/) is a superset of JavaScript.
* [React](https://facebook.github.io/react/) is a UI rendering library.
* [Less](http://lesscss.org/) is a CSS preprocessor.
* [Webpack](https://webpack.js.org/) is a module bundler tool.
* [NodeJS](https://nodejs.org/en/) is used to execute various tools in a build toolchain 
  (e.g., `npm`, `typescript`, `webpack`, `less`).
* [Npm](https://www.npmjs.com/) is used as a package manager and build tasks executor.
* [Yarn](https://yarnpkg.com/) is used as an alternative to `npm`.

Next to these technologies, the following frameworks were used for visualization purposes:
* [Reactstrap](https://reactstrap.github.io/) is a React library for working with [Bootstrap](https://getbootstrap.com/) front-end components. (MIT license)
* [Open Iconic](https://useiconic.com/open/) is used for icons used in tabs. (MIT license)

In order to build the application you should have NodeJS (with npm) and Yarn
installed (latest stable versions are preferrable) and available in your PATH
environment variable. The following commands are then available:

| Command                         | Description                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `npm install` or `yarn`         | Installs the required packages.                                                      |
| `npm run build` or `yarn build` | Builds a production ready version and stores it in the `dist` folder.                |
| `npm start` or `yarn start`     | Executes a webpack dev web server (localhost, port `8091`) and runs the application. |

### IDE

Use of [VSCode](https://code.visualstudio.com/) is recommended for 
editing and debugging the source code. It is a light-weight, free-to-use
open source text editor with built-in support for Typescript.

#### Debugging in your web browser

Owing to enabled source maps, it is possible to debug Typescript
code in the browser. To do that, please open the developer tools panel
and navigate to "Sources". There, the `webpack:///` folder contains the
source code, which allows you to debug the code (add break points, etc).
You should see the source code of `app.tsx`, which is the entry point of 
the application. You can add break points to the code and debug it in 
the same manner as usual for javascript code.

#### Debugging in Visual Studio Code

VSCode sports embedded debugger functionality.
The project already has a debugger configuration in `.vscode\launch.json`.
The debugger uses the [Chrome remote debugging protocol](https://chromedevtools.github.io/debugger-protocol-viewer/),
which requires having the following extension installed: [Debugger for Chrome](https://github.com/Microsoft/vscode-chrome-debug). 
Additionally, the project debugger configuration expects
[Chrome Canary](https://www.google.com/chrome/browser/canary.html) to be installed and
with remote debugger enabled on port `9222`. More info about this extension usage and
configuration is available [on Github](https://github.com/Microsoft/vscode-chrome-debug).

### Directory structure

* `config`
    * `catalog.schema.json` - Schema of a data catalogue.
    * `catalog.json` - Data catalogue that lists datasets available and the services that supply them.
* `app` - Application source code folder.
    * `data` - Contains static data on RDF namespaces and ISO 639 language flags.
    * `services` - Contains services such as config and data loader.
        * `infrastructure` - Contains infrastructure services such as ajax and sparql loaders.
    * `ui` - Contains React UI components.
        * `pages` - Contains the main pages.
        * `sections` - Contains sections for a page (e.g., top menu, taxonomy, information pane, etc.).
        * `tabs` - Contains tabs used within the information pane.
        * `elements` - Contains smaller components used within sections and tabs (e.g., listing and text item).
    * `utils` - Contains utility functions for various needs.
    * `app.tsx` - Entry point of the application, used by Webpack to build the application.
    * `index.ejs` - HTML template for webpack, used for the main page container.
* `static` - Static content folder copied directly to the web-server (fonts, images, CSS styles, etc.).
* `tools`
    * `make-war.js` - Creates a WAR file ready to be deployed to a Tomcat web server.

## License
This code is copyrighted by [Sander Stolk](https://orcid.org/0000-0003-2254-6613)
and released under the [GPL 3.0](https://www.gnu.org/licenses/gpl-3.0.txt) license.