// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as fetch from "isomorphic-fetch";
import { AppConfig } from "app/services/config/app-config";
import { Catalog, DataService, Dataset } from "./data-catalog";

export interface ApiParameter {
    name: string;
    value: any;
}

const cache: any = {};

export abstract class IApiExecutor {
    abstract execute(call: string, parameters?: ApiParameter[], caching?: boolean): Promise<any>;
    abstract getSource(): DataService;

    protected cacheResult(result: any, url: string) {
        cache[url] = result;
    }

    protected getCachedResult(url: string) {
        return cache[url];
    }
}

export class AjaxApiExecutor extends IApiExecutor {
    constructor(private service: DataService, private serviceParameters: ApiParameter[]) {
        super();
    }

    async execute(call: string, parameters: ApiParameter[] = [], caching = true): Promise<any> {
        let url =
            this.service.endpointURL + (this.service.endpointURL.endsWith("/") ? "" : "/") + call;
        const headersObj: { [name: string]: string } = {};

        if (this.service.auth === "basic") {
            headersObj["Authorization"] =
                "Basic " + btoa(this.service.username + ":" + this.service.password);
        }
        // add all parameters (service and current) to url
        parameters = parameters.concat(this.serviceParameters);
        parameters.forEach((param: ApiParameter, index: number) => {
            url +=
                (index == 0 ? "?" : "&") +
                param.name +
                "=" +
                encodeURIComponent(
                    param.value === null
                        ? null
                        : typeof param.value === "object"
                            ? JSON.stringify(param.value)
                            : param.value
                );
        });

        if (caching) {
            const result = this.getCachedResult(url);
            if (result) {
                return result;
            }
        }

        const response = await fetch(url, {
            mode: "cors",
            method: this.service.mode,
            headers: new Headers(headersObj)
        });

        if (!response.ok) {
            const errorMessage = "Api request failed: " + response.statusText;
            throw new Error(errorMessage);
        }

        const result = await response;
        const contentType = response.headers.get("content-type");
        const retval =
            contentType && contentType.indexOf("application/json") !== -1
                ? response.json()
                : result.text();

        if (caching) {
            this.cacheResult(retval, url);
        }

        return retval;
    }

    public getSource(): DataService {
        return this.service;
    }

    public static create(config: AppConfig): AjaxApiExecutor[] {
        return AjaxApiExecutor.createInternal(config.catalog, config.datasetsEnabled);
    }

    protected static createInternal(
        catalog: Catalog,
        datasetsEnabled: string[]
    ): AjaxApiExecutor[] {
        const result: AjaxApiExecutor[] = [];
        for (const service of catalog.service) {
            if (
                service.endpointDescription === "http://evoke.ullet.net/api" ||
                service.endpointDescription === "https://w3id.org/evoke/api"
            ) {
                console.log("Detected Evoke API dataservice: %s", service.title);

                // ensure default parameters for graph are set
                const datasetsServed = catalog.dataset.filter(
                    dataset =>
                        service.servesDataset.includes(dataset["@id" as keyof Dataset]) &&
                        datasetsEnabled.includes(dataset["@id" as keyof Dataset]) &&
                        dataset.distribution.accessService == service["@id" as keyof DataService]
                );
                console.log("Dataservice %s. Serving datasets: %s", service.title, datasetsServed);
                const defaultParams = [];
                for (const dataset of datasetsServed) {
                    let accessGraphs: string | string[] | undefined =
                        dataset.distribution.accessGraph;
                    if (accessGraphs) {
                        if (!Array.isArray(accessGraphs)) {
                            if (accessGraphs == "") {
                                continue;
                            }
                            accessGraphs = [accessGraphs];
                        }
                        for (const accessGraph of accessGraphs) {
                            const param: ApiParameter = {
                                name: "default-graph-uri",
                                value: accessGraph
                            };
                            defaultParams.push(param);
                        }
                    }
                }
                if (datasetsServed && datasetsServed.length > 0) {
                    result.push(new AjaxApiExecutor(service, defaultParams));
                }
            }
        }
        return result;
    }
}
