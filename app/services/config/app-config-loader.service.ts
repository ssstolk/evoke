// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as tv4 from "tv4";
import { AppConfig } from "app/services/config/app-config";
import { appHistory } from "app/services/infrastructure/router-history";
import { Catalog, Dataset } from "app/services/infrastructure/data-catalog";
import { IAjaxService } from "app/services/infrastructure/ajax-service";
import { IApiExecutor, AjaxApiExecutor } from "app/services/infrastructure/api-executor";
import {
    ISparqlExecutor,
    AjaxSparqlExecutor,
    LocalSparqlExecutor
} from "app/services/infrastructure/sparql-executor";
import { RouteComponentProps } from "react-router";
import { setupInject } from "app/di";

const CatalogSchema = require("config/catalog.schema.json");

export abstract class IAppConfigProvider {
    public abstract get config(): AppConfig;
    public abstract apply(routeProps: RouteComponentProps<{}>): boolean;
    public abstract enableLocalDataService(value: boolean): void;

    public abstract loadDefaultCatalog(ajaxService: IAjaxService): Promise<Catalog>;
    public abstract loadOnlineCatalog(
        location: string,
        ajaxService: IAjaxService
    ): Promise<Catalog>;
    public abstract loadOfflineCatalog(file: File, ajaxService: IAjaxService): Promise<Catalog>;
}

export class AppConfigLoaderService implements IAppConfigProvider {
    private _config: AppConfig | undefined;

    get config(): AppConfig {
        if (!this._config) {
            throw new Error("Catalog should be loaded first");
        }
        return this._config;
    }

    public async loadPreferredCatalog(ajaxService: IAjaxService): Promise<Catalog> {
        let sessionCatalog = sessionStorage.getItem("catalog");
        if (!sessionCatalog) {
            // setting sessionCatalog (to null or, possibly, to a catalog found in localStorage)
            const localCatalog = localStorage.getItem("catalog");
            if (!localCatalog) {
                sessionCatalog = "null";
            } else {
                const useLocalCatalog = confirm(
                    "Your previous session used a private catalogue of datasets.\n " +
                        "* Press <OK> to continue working with this catalogue.\n " +
                        "* Press <Cancel> to use the catalogue available publicly instead."
                );
                sessionCatalog = useLocalCatalog ? localCatalog : "null";
                sessionStorage.setItem("catalog", sessionCatalog);
                if (!useLocalCatalog) {
                    localStorage.removeItem("catalog");
                }
            }
        }

        // when sessionCatalog stores a catalog, attempt to load it
        if (sessionCatalog != "null") {
            const catalog = JSON.parse(sessionCatalog);
            const result = await this.processCatalog(catalog, ajaxService, true);
            if (result != null) {
                return result;
            }
        }
        // when sessionCatalog stores "null", load the default catalog
        return await this.loadDefaultCatalog(ajaxService);
    }

    public async loadDefaultCatalog(ajaxService: IAjaxService): Promise<Catalog> {
        const catalog = await ajaxService.getJson<Catalog>("catalog.json", { noCache: true });
        const result = await this.processCatalog(catalog, ajaxService, true);
        return result != null
            ? result
            : { "@id": "", "@type": "Catalog", dataset: [], service: [] };
    }

    // with fallback to default catalog
    public async loadOnlineCatalog(location: string, ajaxService: IAjaxService): Promise<Catalog> {
        const catalog = await ajaxService.getJson<Catalog>(location, { noCache: true });
        const result = await this.processCatalog(catalog, ajaxService, false);
        localStorage.setItem("catalog", JSON.stringify(result));
        sessionStorage.setItem("catalog", JSON.stringify(result));
        return result != null ? result : await this.loadDefaultCatalog(ajaxService);
    }

    // with fallback to default catalog
    public async loadOfflineCatalog(file: File, ajaxService: IAjaxService): Promise<Catalog> {
        const fileContent = await this.getFileContents(file);
        const result = await this.processCatalog(JSON.parse(fileContent), ajaxService, false);
        localStorage.setItem("catalog", JSON.stringify(result));
        sessionStorage.setItem("catalog", JSON.stringify(result));
        return result != null ? result : await this.loadDefaultCatalog(ajaxService);
    }

    protected async getFileContents(file: File): Promise<any> {
        return new Promise((resolve, reject) => {
            let content = "";
            const reader = new FileReader();
            reader.onloadend = function(e: any) {
                content = e.target.result;
                resolve(content);
            };
            reader.onerror = function(e) {
                reject(e);
            };
            reader.readAsText(file);
        });
    }

    public async processCatalog(
        catalog: Catalog,
        ajaxService: IAjaxService,
        throwError = true
    ): Promise<Catalog | null> {
        const errorMessages = this.validate(catalog, throwError);
        // handling of any error messages in case function validate was set not to throw error
        if (errorMessages && Array.isArray(errorMessages)) {
            return null;
        }

        // load any referenced sparql queries dynamically and in parallel
        const promises: Promise<any>[] = [];
        this.loadTextDataFromUrlRecursively(catalog, ajaxService, promises);
        await Promise.all(promises);

        const localDataServiceEnabled = localStorage.getItem("localDataServiceEnabled") != "false";
        this._config = { catalog, datasetsEnabled: [], localDataServiceEnabled };

        if (appHistory && appHistory.location) {
            const params = new URLSearchParams(appHistory.location.search);
            const setsRequested = params.getAll("source");
            this.applySources(setsRequested);
        }
        console.log(this._config);
        return catalog;
    }

    /**
     * This functions iterates over ALL properties of config object recursively and loads a text data
     * specified by relative url in case of value matches the "url:Relative_url_path" pattern.
     * Will return array of promises, each promise is responsible of loading the data and
     * assigning the value back to config object.
     * @param configObj The config object
     * @param ajaxService The ajax service instance
     * @param promises Resulting array of promises
     */
    private loadTextDataFromUrlRecursively(
        configObj: any,
        ajaxService: IAjaxService,
        promises: Promise<any>[]
    ) {
        for (const [key, value] of Object.entries(configObj)) {
            if (typeof value === "string") {
                const valStr = value as string;
                if (valStr.startsWith("url:")) {
                    const url = valStr.substr(4);
                    const loader = async () => {
                        const loadedData = await ajaxService.getText(url);
                        configObj[key] = loadedData;
                    };
                    promises.push(loader());
                }
            } else if (typeof value === "object" && value) {
                this.loadTextDataFromUrlRecursively(value, ajaxService, promises);
            }
        }
    }

    /**
     * This function checks that the configuration conforms to the schema
     */
    private validate(config: Catalog, throwError: boolean): string[] | null {
        const validationResult = tv4.validateMultiple(config, CatalogSchema);
        if (!validationResult.valid) {
            const messages = validationResult.errors.map(
                (error: any) => `Error message: "${error.message}". Data path: "${error.dataPath}".`
            );
            if (!throwError) {
                return messages;
            }
            throw new Error(
                `The configuration file for the application does not conform to the schema.\r\n${messages.join(
                    "\r\n"
                )}`
            );
        }
        return null;
    }

    public apply(routeProps: RouteComponentProps<{}>): boolean {
        const params = new URLSearchParams(routeProps.location.search);
        const setsRequested = params.getAll("source");
        return this.applySources(setsRequested);
    }

    private applySources(setsRequested: string[]): boolean {
        if (!this._config || !this._config.datasetsEnabled) {
            return false;
        }
        let result = false;
        const setsAvailable = this._config.catalog.dataset;
        const setsApproved = [];

        for (const setAvailable of setsAvailable) {
            const setId = setAvailable["@id" as keyof Dataset];
            const indexId = setsRequested.indexOf(encodeURIComponent(setId));
            const indexIdentifier = setsRequested.indexOf(setAvailable.identifier);
            if (indexId >= 0) {
                setsApproved[indexId] = setId;
            }
            if (indexIdentifier >= 0) {
                setsApproved[indexIdentifier] = setId;
            }
        }

        const prevDatasetsEnabled = this._config.datasetsEnabled;
        const currDatasetsEnabled = setsApproved.filter(() => true).sort();
        this._config.datasetsEnabled = currDatasetsEnabled;

        if (!this.identicalArrays(prevDatasetsEnabled, currDatasetsEnabled)) {
            result = true;
        }

        console.log("applied url props to application configuration:");
        console.log(this._config.datasetsEnabled);

        // TODO: make this happen via an onChange event listener instead
        setupInject(IApiExecutor, AjaxApiExecutor.create(this._config));
        setupInject(
            ISparqlExecutor,
            (AjaxSparqlExecutor.create(this._config) as ISparqlExecutor[]).concat(
                LocalSparqlExecutor.create(this._config) as ISparqlExecutor[]
            )
        );

        return result;
    }

    private identicalArrays(array1: string[], array2: string[]): boolean {
        return (
            array1.length === array2.length &&
            array1.every(function(value, index) {
                return value === array2[index];
            })
        );
    }

    public enableLocalDataService(value: boolean): void {
        if (this._config) {
            this._config.localDataServiceEnabled = value;
        }
        localStorage.setItem("localDataServiceEnabled", JSON.stringify(value));
    }
}
