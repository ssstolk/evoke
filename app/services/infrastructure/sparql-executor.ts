// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import "isomorphic-fetch";
import * as N3 from "n3";
import { Catalog, Dataset, DataService } from "./data-catalog";
import * as RDFJS from "@comunica/actor-init-sparql-rdfjs";
import { ApiParameter } from "./api-executor";
import { AppConfig } from "app/services/config/app-config";
import { IActorQueryOperationOutput } from "@comunica/bus-query-operation";
import { JsonLdParser } from "jsonld-streaming-parser";
import { RDF, RDFS, OWL, SKOS, DCTERMS, ONTOLEX, TREE, OA } from "app/data/rdf/namespaces";
import { Quad } from "rdf-js";

export type SparqlVarValue = {
    [varName: string]: SparqlValue;
};

export type SparqlValue = {
    type: "literal" | "uri";
    value: any;
    datatype?: string;
    "xml:lang"?: string;
};

export interface SparqlQueryParameter {
    name: string;
    type: "uri" | "text";
    value: string;
}

export type SparqlQueryParameters = SparqlQueryParameter[];

export interface ISparqlJsonResult {
    head: {
        vars: string[];
    };
    results: {
        distinct: boolean;
        ordered: boolean;
        bindings: SparqlVarValue[];
    };
}

const EmptySparqlJsonResult: ISparqlJsonResult = {
    head: {
        vars: []
    },
    results: {
        distinct: false,
        ordered: false,
        bindings: []
    }
};

let localSE: LocalSparqlExecutor;
const cache: any = {};

export abstract class ISparqlExecutor {
    abstract execute(
        query: string,
        parameters: SparqlQueryParameters,
        caching?: boolean
    ): Promise<ISparqlJsonResult>;
    abstract getSource(): DataService;

    protected applyParametersToQuery(query: string, parameters: SparqlQueryParameters): string {
        for (const param of parameters) {
            // TODO: improve regular expression to replace parameters with values
            const regExp = new RegExp(`[\\?|\\*]${param.name}`, "gi");
            switch (param.type) {
                case "uri":
                    query = query.replace(regExp, `<${param.value}>`);
                    break;
                case "text":
                    query = query.replace(regExp, `"${param.value}"`);
                    break;
            }
        }
        return query;
    }

    protected validateJsonResponse(response: ISparqlJsonResult) {
        if (!response.head) {
            throw new Error("Sparql response is missing 'head' property");
        }
        if (!response.head.vars) {
            throw new Error("Sparql response is missing 'head.vars' property");
        }
        if (!response.results) {
            throw new Error("Sparql response is missing 'results' property");
        }
        if (!response.results.bindings) {
            throw new Error("Sparql response is missing 'results.bindings' property");
        }
    }

    protected cacheResult(result: any, endpoint: string, query: string) {
        if (cache[endpoint] == undefined) {
            cache[endpoint] = {};
        }
        cache[endpoint][query] = result;
    }

    protected getCachedResult(endpoint: string, query: string) {
        return cache[endpoint] === undefined ? undefined : cache[endpoint][query];
    }
}

export class AjaxSparqlExecutor extends ISparqlExecutor {
    constructor(private service: DataService, private serviceParameters: ApiParameter[]) {
        super();
    }

    async execute(
        query: string,
        parameters: SparqlQueryParameters,
        caching = true
    ): Promise<ISparqlJsonResult> {
        query = this.applyParametersToQuery(query, parameters);
        let url = this.service.endpointURL;
        const headersObj: { [name: string]: string } = {
            Accept: "application/sparql-results+json"
        };
        let body: string | undefined;

        if (this.service.auth === "basic") {
            headersObj["Authorization"] =
                "Basic " + btoa(this.service.username + ":" + this.service.password);
        }

        const apiParameters = this.serviceParameters.concat([]);
        if (this.service.mode === "get") {
            apiParameters.push({ name: "query", value: query });
        } else {
            body = query;
            headersObj["Content-Type"] = "application/sparql-query";
        }
        // add all parameters
        apiParameters.forEach((param: ApiParameter, index: number) => {
            url += (index == 0 ? "?" : "&") + param.name + "=" + encodeURIComponent(param.value);
        });

        if (caching) {
            const result = this.getCachedResult(url, query);
            if (result) {
                return result;
            }
        }

        const response = await fetch(url, {
            mode: "cors",
            method: this.service.mode,
            body: body,
            headers: new Headers(headersObj)
        });

        if (!response.ok) {
            const errorMessage = "Sparql request failed: " + response.statusText;
            throw new Error(errorMessage);
        }

        const result = await response.json();
        this.validateJsonResponse(result);
        //        console.log(query);
        //        console.log(result);

        if (caching) {
            this.cacheResult(result, url, query);
        }

        return result;
    }

    public getSource(): DataService {
        return this.service;
    }

    public static create(config: AppConfig): AjaxSparqlExecutor[] {
        return AjaxSparqlExecutor.createInternal(config.catalog, config.datasetsEnabled);
    }

    protected static createInternal(
        catalog: Catalog,
        datasetsEnabled: string[]
    ): AjaxSparqlExecutor[] {
        const result: AjaxSparqlExecutor[] = [];
        for (const service of catalog.service) {
            if (
                service.endpointDescription ===
                    "http://www.w3.org/ns/sparql-service-description#Service" &&
                service.endpointURL !== LOCAL_STORAGE
            ) {
                console.log("Detected remote SPARQL dataservice: %s", service.title);

                // ensure default parameters for graph are set
                const datasetsServed = catalog.dataset.filter(
                    dataset =>
                        service.servesDataset.includes(dataset["@id" as keyof Dataset]) &&
                        datasetsEnabled.includes(dataset["@id" as keyof Dataset]) &&
                        dataset.distribution.accessService == service["@id" as keyof DataService]
                );
                console.log("Dataservice %s. Serving datasets: %s", service.title, datasetsServed);
                const serviceParams = [];
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
                            serviceParams.push(param);
                        }
                    }
                }

                result.push(new AjaxSparqlExecutor(service, serviceParams));
            }
        }
        return result;
    }
}

export const LOCAL_STORAGE = "https://www.w3.org/TR/webstorage/#dom-localstorage";
export const LOCAL_STORAGE_DATASET = "LD-dataset";
export const LOCAL_STORAGE_DATASERVICE = {
    "@id": "",
    "@type": "http://www.w3.org/ns/dcat#DataService",
    title: "Local storage",
    identifier: "LS",
    endpointURL: LOCAL_STORAGE,
    endpointDescription: "http://www.w3.org/ns/sparql-service-description#Service",
    servesDataset: []
};

export class LocalSparqlExecutor extends ISparqlExecutor {
    store = new N3.Store();
    engine = RDFJS.newEngine();
    populating = false;

    constructor() {
        super();
    }

    public populate(input?: string) {
        while (this.populating) {
            /* */
        }

        console.log("Repopulating local SPARQL endpoint");

        this.populating = true;
        this.store = this.store.size == 0 ? this.store : new N3.Store();
        const localLD = input || localStorage.getItem(LOCAL_STORAGE_DATASET);

        if (!localLD || localLD.length == 0) {
            this.populating = false;
        } else {
            const n3parser = new N3.Parser();
            n3parser.parse(localLD, (error: any, quad: any, prefixes: any) => {
                if (quad) {
                    this.store.addQuad(quad);
                }
                // if (error) {
                //     console.log("The linked data stored locally could not be read as N3. %s", error);
                // }
            });

            const jsonparser = new JsonLdParser()
                .on("data", (quad: N3.Quad) => this.store.addQuad(quad))
                .on("end", () => {
                    console.log("Finished populating local SPARQL endpoint");
                    this.populating = false;
                })
                .on("error", error => {
                    //                    console.log("The linked data stored locally could not be read as JSON-LD. %s", error)
                });
            jsonparser.write(localLD);
            jsonparser.end();
        }
    }

    protected delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async execute(
        query: string,
        parameters: SparqlQueryParameters,
        caching = false
    ): Promise<ISparqlJsonResult> {
        const originalQuery = query;
        query = this.applyParametersToQuery(query, parameters);
        query = this.removeSubClassOfPaths(query);
        query = this.expandPropertyPaths(query);
        query = this.removeUnionsWithZeroOrMorePropertyPath(query);
        query = this.switchToLocalSearch(query);
        query = this.removeOrderBy(query);
        query = this.removeDistinct(query);

        console.log(query);

        if (caching) {
            const result = this.getCachedResult(LOCAL_STORAGE, query);
            if (result) {
                return result;
            }
        }

        while (this.populating) {
            console.log("Awaiting population local SPARQL endpoint.");
            await this.delay(400);
        }

        if (this.store && this.store.size == 0) {
            console.log("Sparql request on local storage was skipped; storage is empty.");
            return EmptySparqlJsonResult;
        }

        let queryOutput, error;
        try {
            queryOutput = (await this.engine.query(query, {
                sources: [{ type: "rdfjsSource", value: this.store }]
            })) as IActorQueryOperationOutput;
        } catch (e) {
            error = e;
        }

        if (!queryOutput) {
            console.log("Sparql request failed on local storage\r\n" + error);
            return EmptySparqlJsonResult;
        }

        const result = await this.engine.resultToString(
            queryOutput,
            "application/sparql-results+json"
        );
        const resultString = await this.streamToString(result.data);

        console.log(resultString);
        let resultJSON = JSON.parse(resultString);
        this.validateJsonResponse(resultJSON);
        resultJSON = this.orderResults(resultJSON, originalQuery);

        if (caching) {
            this.cacheResult(resultJSON, LOCAL_STORAGE, query);
        }

        return resultJSON;
    }

    protected streamToString(stream: NodeJS.ReadableStream): Promise<string> {
        const chunks: Buffer[] = [];
        return new Promise((resolve, reject) => {
            stream.on("error", reject);
            stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
            stream.on("close", () => resolve(Buffer.concat(chunks).toString("utf8")));
            stream.on("data", chunk => {
                chunks.push(chunk);
            });
        });
    }

    protected switchToLocalSearch(query: string): string {
        // Rewriting fti:match so that basic searches can be performed in local storage, e.g.
        //   - FROM: (?entry ?o) fti:match ?searchKey .
        //   - TO:   ?entry ?p ?o . FILTER (CONTAINS(?o, ?searchKey)) .
        const regex = /\((\?[^?\s]*)\s*(\?[^?\s]*)\)\s*(fti:match|<http:\/\/franz\.com\/ns\/allegrograph\/2\.2\/textindex\/match>)\s*([^\.]*)/m;
        const subst = "$1 ?predicateForLocalSearch $2 . FILTER(CONTAINS($2, $4)) ";
        return query.replace(regex, subst);
    }

    protected removeSubClassOfPaths(query: string): string {
        return query.replace(/\/rdfs:subClassOf\*/gi, "");
    }

    protected removeOrderBy(query: string): string {
        return query.replace(/order by.*/gi, "");
    }

    protected removeDistinct(query: string): string {
        return query.replace(/distinct\s/gi, "");
    }

    protected expandPropertyPaths(query: string): string {
        // find property path forward slashes and predicate following it, see https://regex101.com/r/Mq56Qw/2
        const regex = /(\/)(a[\/\s]|<\S*>|[^\s\/\<]*:[^<\s\/]*)/i;

        // replace one at a time, so as to introduce a new pair of variables each time
        let oldQuery = "";
        for (let i = 0; query != oldQuery; i++) {
            oldQuery = query;
            const nodeTemp = "?anon_localsparql_var" + i;
            query = query.replace(regex, " " + nodeTemp + " . " + nodeTemp + " $2");
        }

        return query;
    }

    protected removeUnionsWithZeroOrMorePropertyPath(query: string): string {
        const regex = /\}\s*UNION\s*\{/gi;
        const indices = [];
        let result = regex.exec(query);
        while (result) {
            indices.push(result.index + 1); // skip the '}' preceding the UNION
            result = regex.exec(query);
        }

        for (const unionIndex of indices.reverse()) {
            const pattern = this.getPattern(query, unionIndex);
            if (pattern && (pattern.includes("*") || pattern.includes("+"))) {
                query = query
                    .substring(0, unionIndex)
                    .concat(query.substring(unionIndex + pattern.length));
            }
        }
        return query;
    }

    protected orderResults(json: any, query: string): any {
        if (json && query) {
            // TODO: order response records according to the query ORDER BY clause
        }
        return json;
    }

    protected getPattern(s: string, from: number): string {
        s = s.substring(from);
        const start = s.indexOf("{");
        let count = 1;
        let i;
        for (i = start + 1; i < s.length && count > 0; i++) {
            const c = s.charAt(i);
            if (c == "{") {
                count++;
            } else if (c == "}") {
                count--;
            }
        }
        return s.substring(0, i + 1);
    }

    public getSource(): DataService {
        return LOCAL_STORAGE_DATASERVICE;
    }

    public async toTurtle(): Promise<string> {
        this.populate();
        while (this.populating) {
            console.log("Awaiting population local SPARQL endpoint.");
            await this.delay(400);
        }

        const writer = new N3.Writer({
            prefixes: {
                rdf: RDF,
                rdfs: RDFS,
                owl: OWL,
                skos: SKOS,
                dcterms: DCTERMS,
                ontolex: ONTOLEX,
                tree: TREE,
                oa: OA
            }
        });

        if (this.store) {
            const quadStream = this.store.match();
            let quad: Quad | null = quadStream.read();
            while (quad !== null) {
                writer.addQuad(quad);
                quad = quadStream.read();
            }
        }
        return await this.writerEnd(writer);
    }

    protected writerEnd(writer: N3.Writer /*N3.N3Writer*/): Promise<string> {
        return new Promise((resolve, reject) => {
            writer.end((error: any, result: any) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    }

    public static create(config: AppConfig): LocalSparqlExecutor[] {
        return !config.localDataServiceEnabled
            ? []
            : LocalSparqlExecutor.createInternal(config.catalog, config.datasetsEnabled);
    }

    protected static createInternal(
        catalog: Catalog,
        datasetsEnabled: string[]
    ): LocalSparqlExecutor[] {
        if (!localSE) {
            localSE = new LocalSparqlExecutor();
            localSE.populate();
        }
        return [localSE];
    }
}
