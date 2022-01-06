// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import "core-js/es6"; // Include polyfills to work in IE11
import "core-js/es7"; // Include polyfills to work in IE11
import * as React from "react";
import * as ReactDOM from "react-dom";
import { AjaxService } from "app/services/infrastructure/ajax-service";
import { AjaxApiExecutor, IApiExecutor } from "app/services/infrastructure/api-executor";
import {
    AjaxSparqlExecutor,
    ISparqlExecutor,
    LocalSparqlExecutor
} from "app/services/infrastructure/sparql-executor";
import { AppConfig } from "app/services/config/app-config";
import {
    AppConfigLoaderService,
    IAppConfigProvider
} from "app/services/config/app-config-loader.service";
import { ErrorPage } from "app/ui/pages/error.page";
import { Main } from "app/ui/main";
import { resolveInject, setupInject } from "app/di";

import "./app.less";

async function runApp() {
    const appHostDomElement = document.getElementById("app-container") || document.body;
    try {
        //await stay(2000);

        // set up configuration
        const ajaxService = new AjaxService();
        const confLoader = new AppConfigLoaderService();
        await confLoader.loadPreferredCatalog(ajaxService);
        setupInject(IAppConfigProvider, confLoader);
        configureDataServices(confLoader.config);

        // set up drop zone for configuration on entire document
        document.addEventListener("dragover", handleDragOver, false);
        document.addEventListener("drop", handleDrop, false);

        // render the app
        ReactDOM.render(<Main />, appHostDomElement);
    } catch (ex) {
        ReactDOM.render(<ErrorPage error={ex} />, appHostDomElement);
        throw ex;
    }
}

function configureDataServices(appConfig: AppConfig) {
    // set up data services (based on configuration)
    const apiExecutors = AjaxApiExecutor.create(appConfig);
    const sparqlExecutors = (AjaxSparqlExecutor.create(appConfig) as ISparqlExecutor[]).concat(
        LocalSparqlExecutor.create(appConfig) as ISparqlExecutor[]
    );
    setupInject(IApiExecutor, apiExecutors);
    setupInject(ISparqlExecutor, sparqlExecutors);
}

function handleDragOver(evt: DragEvent) {
    evt.stopPropagation();
    evt.preventDefault();
    // explicitly show this is a copy
    if (evt.dataTransfer) {
        evt.dataTransfer.dropEffect = "copy";
    }
}

async function handleDrop(evt: DragEvent) {
    evt.stopPropagation();
    evt.preventDefault();
    if (evt.dataTransfer) {
        const files = evt.dataTransfer.files; // FileList object.
        if (files.length > 0) {
            const file = files[0];

            // set up configuration
            const ajaxService = new AjaxService();
            const appConfigProvider = resolveInject(IAppConfigProvider);
            await appConfigProvider.loadOfflineCatalog(file, ajaxService);
            configureDataServices(appConfigProvider.config);

            // TODO: update browser url to reflect changed datasetsEnabled
        }
    }
}

Object.assign(window, {
    app: {
        run: runApp
    }
});
