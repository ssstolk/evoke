// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as twitterText from "twitter-text";
import makeTrashable from "trashable";
import { AppConfigAccess } from "app/services/config/app-config";
import { DataService } from "app/services/infrastructure/data-catalog";
import { escapeRegExp } from "app/utils/syntax-helpers";
import { IApiExecutor } from "app/services/infrastructure/api-executor";
import { IAppConfigProvider } from "app/services/config/app-config-loader.service";
import {
    ISparqlExecutor,
    LOCAL_STORAGE_DATASET
} from "app/services/infrastructure/sparql-executor";
import { LanguageHelper } from "app/utils/language-helper";
import { LocalData } from "app/utils/localdata-helper";
import { RDFS, SKOS, ONTOLEX, OA } from "app/data/rdf/namespaces";
import { RandomHelper } from "app/utils/random-helper";
import { resolveInjectArray, resolveInject } from "app/di";
import {
    SparqlResultParser,
    SparqlRecord,
    getFirstValue,
    getValueList,
    getFirstNode
} from "app/services/infrastructure/sparql-result-parser";
import { TermBuilder, ITerm, ITermWeighted } from "app/services/data-model";

interface Subscription {
    object: React.Component;
    trashablePromise: any;
}

export interface SearchOptions {
    limit?: number;
    type?: "concept" | "sense" | "entry";
    sort?: "az" | "length";
}

export class DataLoader {
    private static subscriptions: Subscription[] = [];

    public static async subscribe(object: React.Component, promise: Promise<any>) {
        const trashablePromise = makeTrashable(promise);
        const subscription: Subscription = { object, trashablePromise };
        this.subscriptions.push(subscription);
        return await trashablePromise;
    }

    public static unsubscribe(object: React.Component) {
        this.subscriptions
            .filter((element: Subscription) => {
                return element.object === object;
            })
            .forEach((element: Subscription) => {
                element.trashablePromise.trash();
            });

        this.subscriptions = this.subscriptions.filter((element: Subscription) => {
            return element.object !== object;
        });
    }

    public static getMainDataService(): DataService | undefined {
        const appConfig = resolveInject(IAppConfigProvider).config;
        if (appConfig.datasetsEnabled.length > 0) {
            const firstDatasetIri = appConfig.datasetsEnabled[0];
            return AppConfigAccess.getDataServiceForDataset(firstDatasetIri, appConfig);
        }
        return undefined;
    }

    public static async loadCategoryLocation(iri: string): Promise<ITerm[]> {
        let result: ITerm[] = [];

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadCategoryLocation", [
                { name: "iri", value: iri }
            ]);
            result = result.concat(data === null ? [] : data);
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
            SELECT ?category ?categoryName #(COUNT(DISTINCT ?ancestor) AS ?ancestorDistance)
            WHERE {
                # a term is possibly a category itself or a word sense
                { 
                    ?term a ontolex:LexicalConcept .
                    ?term skos:broader* ?category .
                } UNION {
                    ?term a ontolex:LexicalSense .
                    ?term ontolex:isLexicalizedSenseOf/skos:broader* ?category .
                }
                ?category a ontolex:LexicalConcept .
                ?category skos:prefLabel ?categoryName .
                ?category skos:broader* ?ancestor .
            }
            GROUP BY ?category ?categoryName
            ORDER BY ASC(?ancestorDistance)`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "term", type: "uri", value: iri }
            ]);

            const sparqlRecords = SparqlResultParser.parse(sparqlResult);
            if (!(sparqlRecords.length == 1 && !getFirstValue(sparqlRecords, "category"))) {
                const data = sparqlRecords.map(record =>
                    TermBuilder.parseFromSparqlRecord(record, "category", "categoryName")
                );
                result = result.concat(data === null ? [] : data);
            }
        }
        return result;
    }

    public static async loadTopCategories(): Promise<ITerm[]> {
        let result: ITerm[] = [];

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadTopCategories");
            result = result.concat(data === null ? [] : data);
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            SELECT ?category ?categoryName
            WHERE {
                ?category skos:topConceptOf ?thesaurus .
                ?category skos:prefLabel ?categoryName .
            }
            ORDER BY ?categoryName ?category`;

            const sparqlResult = await sparqlExecutor.execute(query, []);

            const sparqlRecords = SparqlResultParser.parse(sparqlResult);
            if (!(sparqlRecords.length == 1 && !getFirstValue(sparqlRecords, "category"))) {
                const data = sparqlRecords.map(record =>
                    TermBuilder.parseFromSparqlRecord(record, "category", "categoryName")
                );
                result = result.concat(data === null ? [] : data);
            }
        }
        return result;
    }

    public static async loadSubCategories(iri: string): Promise<ITerm[]> {
        let result: ITerm[] = [];

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadSubCategories", [
                { name: "iri", value: iri }
            ]);
            result = result.concat(data === null ? [] : data);
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            SELECT ?category ?categoryName
            WHERE {
                ?parentCategory ^skos:broader ?category .
                ?category skos:prefLabel ?categoryName .
            }
            ORDER BY ?categoryName ?category`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "parentCategory", type: "uri", value: iri }
            ]);

            const sparqlRecords = SparqlResultParser.parse(sparqlResult);
            if (!(sparqlRecords.length == 1 && !getFirstValue(sparqlRecords, "category"))) {
                const data = sparqlRecords.map(record =>
                    TermBuilder.parseFromSparqlRecord(record, "category", "categoryName")
                );
                result = result.concat(data === null ? [] : data);
            }
        }

        return result;
    }

    public static async loadResourceType(iri: string) {
        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadResourceType", [
                { name: "iri", value: iri }
            ]);
            if (data) {
                console.log("type of " + iri + ": " + data);
                return data;
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>        
            PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
            PREFIX oa: <http://www.w3.org/ns/oa#>
            SELECT DISTINCT ?type
            WHERE {
                {
                    ?this a/rdfs:subClassOf* ontolex:LexicalConcept .
                    BIND ("concept" AS ?type) .
                } UNION {
                    ?this a/rdfs:subClassOf* skos:Concept .
                    FILTER NOT EXISTS { 
                        # would indicate "label" as type
                        ?annotation oa:hasSource ?this .
                    }
                    BIND ("concept" AS ?type) .
                } UNION {
                    ?this a/rdfs:subClassOf* ontolex:LexicalSense .
                    BIND ("sense" AS ?type) .
                } UNION {
# AGRAPH FIX: cannot handle subClassOf property path for ontolex:LexicalEntry
#                   ?this a/rdfs:subClassOf* ontolex:LexicalEntry .
                    ?this a ontolex:LexicalEntry .
                    BIND ("entry" AS ?type) .
                } UNION {
                    FILTER (CONTAINS(STR(?this), "pos/#")) .
                    BIND ("pos" AS ?type) .
                } UNION {
                    ?this a/rdfs:subClassOf* oa:Annotation .
                    BIND ("annotation" AS ?type) .
                } UNION {
                    FILTER (CONTAINS(STR(?this), "distribution/#")) .
                    BIND ("label" AS ?type) .
                } UNION {
                    FILTER EXISTS {
                        ?annotation oa:hasSource ?this .
                    }
                    BIND ("label" AS ?type) .
                }
            } 
            ORDER BY ?type
            LIMIT 1`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const records = SparqlResultParser.parse(sparqlResult);
            const data = getFirstValue(records, "type"); //as EvokeResourceType;
            if (data) {
                console.log("type of " + iri + ": " + data);
                return data;
            }
        }
        console.log("type of " + iri + ": null");
        return null;
    }

    public static async loadConceptName(iri: string) {
        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadConceptName", [
                { name: "iri", value: iri }
            ]);
            if (data) {
                return data;
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            SELECT ?name
            WHERE {
                ?this skos:prefLabel ?name .
            }
            ORDER BY ?name
            LIMIT 1`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const records = SparqlResultParser.parse(sparqlResult);
            const data = getFirstNode(records, "name");
            if (data) {
                return data;
            }
        }
        return null;
    }

    public static async loadSenseName(iri: string) {
        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadSenseName", [{ name: "iri", value: iri }]);
            if (data) {
                return data;
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            SELECT ?name
            WHERE {
                ?this skos:prefLabel ?name .
            }
            ORDER BY ?name
            LIMIT 1`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const records = SparqlResultParser.parse(sparqlResult);
            const data = getFirstNode(records, "name");
            if (data) {
                return data;
            }
        }
        return null;
    }

    public static async loadEntryName(iri: string) {
        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadEntryName", [{ name: "iri", value: iri }]);
            if (data) {
                return data;
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            SELECT ?name
            WHERE {
                ?this skos:prefLabel ?name .
            }
            ORDER BY ?name
            LIMIT 1`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const records = SparqlResultParser.parse(sparqlResult);
            const data = getFirstNode(records, "name");
            if (data) {
                return data;
            }
        }
        return null;
    }

    public static async loadPosName(iri: string) {
        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadPosName", [{ name: "iri", value: iri }]);
            if (data) {
                return data;
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            SELECT ?name
            WHERE {
                ?this skos:prefLabel ?name .
            }
            ORDER BY ?name
            LIMIT 1`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const records = SparqlResultParser.parse(sparqlResult);
            const data = getFirstNode(records, "name");
            if (data) {
                return data;
            }
        }
        return null;
    }

    public static async loadLabelName(iri: string) {
        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadLabelName", [{ name: "iri", value: iri }]);
            if (data) {
                return data;
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            SELECT ?name
            WHERE {
                ?this skos:prefLabel ?name .
            }
            ORDER BY ?name
            LIMIT 1`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const records = SparqlResultParser.parse(sparqlResult);
            const data = getFirstNode(records, "name");
            if (data) {
                return data;
            }
        }
        return null;
    }

    public static async loadAnnotationName(iri: string) {
        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadAnnotationName", [
                { name: "iri", value: iri }
            ]);
            if (data) {
                return data;
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            PREFIX oa: <http://www.w3.org/ns/oa#>
            SELECT ?name
            WHERE {
                {
                    ?this oa:bodyValue ?name .
                } UNION {
                    ?this oa:hasBody ?body .
                    ?body a oa:TextualBody .
                    ?body rdf:value ?name .
                }
            }
            ORDER BY ?name
            LIMIT 1`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const records = SparqlResultParser.parse(sparqlResult);
            const data = getFirstNode(records, "name");
            if (data) {
                return data;
            }
        }
        return null;
    }

    public static async loadAnnotationBody(iri: string) {
        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadAnnotationBody", [
                { name: "iri", value: iri }
            ]);
            if (data) {
                return data;
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX oa: <http://www.w3.org/ns/oa#>
            SELECT ?body
            WHERE {
                ?this oa:hasBody ?body .
            }
            ORDER BY ?body
            LIMIT 1`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const records = SparqlResultParser.parse(sparqlResult);
            const data = getFirstValue(records, "body");
            if (data) {
                return data;
            }
        }
        return null;
    }

    public static async loadResourceName(iri: string) {
        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadResourceName", [
                { name: "iri", value: iri }
            ]);
            if (data) {
                return data;
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>        
            PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            SELECT ?name
            WHERE {
                {
                    ?this skos:prefLabel ?name .
                    BIND (true AS ?prefPrio) .
                }
                UNION 
                {
                    ?this rdfs:label ?name .
                }
                BIND (LANG(?name) AS ?lang) .
                BIND (IF(?lang = "en", true, false) AS ?langPrio) . 
            }
            ORDER BY DESC(?prefPrio) DESC(?langPrio) ?lang ?name
            LIMIT 1`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const records = SparqlResultParser.parse(sparqlResult);
            const data = getFirstNode(records, "name");
            if (data) {
                return data;
            }
        }
        return null;
    }

    public static async loadAnnotationLabels(iri: string) {
        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadAnnotationLabels", [
                { name: "iri", value: iri }
            ]);
            if (data) {
                return data;
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX oa: <http://www.w3.org/ns/oa#>
            SELECT ?label
            WHERE {
                ?this oa:hasBody/oa:hasSource ?label .
            }
            ORDER BY ?label`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const records = SparqlResultParser.parse(sparqlResult);
            const data = getValueList(records, "label");
            if (data) {
                return data;
            }
        }
        return null;
    }

    public static async loadSenseInfo(iri: string) {
        let result: SparqlRecord[] = [];

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadSenseInfo", [{ name: "iri", value: iri }]);
            result = result.concat(data === null ? [] : data);
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>        
            PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
            PREFIX dcterms: <http://purl.org/dc/terms/>
            PREFIX tree: <https://w3id.org/lemon-tree#>
            PREFIX oa: <http://www.w3.org/ns/oa#>
            SELECT DISTINCT ?group ?entry
            WHERE {
                {
                    ?this ?group ?entry .
                    FILTER (?group NOT IN (ontolex:isSenseOf, ontolex:isLexicalizedSenseOf, tree:isSenseIn, dcterms:subject)) .
                    MINUS { ?group rdfs:subPropertyOf* skos:hiddenLabel } .
                } UNION {
                    ?this ontolex:isLexicalizedSenseOf ?concept .
                    ?synonym ontolex:isLexicalizedSenseOf ?concept .
                    FILTER (?this != ?synonym) .
                    BIND (?synonym AS ?entry) .
                    BIND ("Synonym / translation" AS ?group) . 
                }
            }
            ORDER BY ?group ?entry`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const data = SparqlResultParser.parse(sparqlResult);
            result = result.concat(data === null ? [] : data);
        }
        return result;
    }

    public static async loadSenseLocations(iri: string) {
        let result: string[] = [];

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadSenseLocations", [
                { name: "iri", value: iri }
            ]);
            result = result.concat(data === null ? [] : data);
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query =
                `SELECT ?concept
            WHERE {
                ` +
                DataLoader.getTriplePatternsLexicalization("this", "concept") +
                `
            }
            ORDER BY ?concept`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const records = SparqlResultParser.parse(sparqlResult);
            const data = getValueList(records, "concept");
            result = result.concat(data === null ? [] : data);
        }
        return result.length > 0 ? result : null;
    }

    public static async loadSenseEntry(iri: string) {
        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadSenseEntry", [{ name: "iri", value: iri }]);
            if (data) {
                return data;
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
            SELECT ?entry
            WHERE {
                ?this ontolex:isSenseOf ?entry .
            }
            ORDER BY ?entry`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const records = SparqlResultParser.parse(sparqlResult);
            const data = getFirstValue(records, "entry");
            if (data) {
                return data;
            }
        }
        return null;
    }

    public static async loadSensePos(iri: string) {
        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadSensePos", [{ name: "iri", value: iri }]);
            if (data) {
                return data;
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
            SELECT ?pos
            WHERE {
                ?this ontolex:isSenseOf/a ?pos .
                FILTER (CONTAINS(STR(?pos), "pos/#")) .
            }
            ORDER BY ?pos
            LIMIT 1`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const records = SparqlResultParser.parse(sparqlResult);
            const data = getFirstValue(records, "pos");
            if (data) {
                return data;
            }
        }
        return null;
    }

    public static async loadSenseWordcloud(iri: string) {
        let result: ITermWeighted[] = [];

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadSenseWordcloud", [
                { name: "iri", value: iri }
            ]);
            result = result.concat(data === null ? [] : data);
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query =
                `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
            SELECT DISTINCT ?category ?categoryName
            WHERE {
                ?this skos:prefLabel ?label .
                ?sense skos:prefLabel ?label .
                ?this ontolex:isSenseOf*/a ?pos .
                ?sense ontolex:isSenseOf*/a ?pos .
                FILTER (CONTAINS(STR(?pos), "pos/#")) .
                ` +
                DataLoader.getTriplePatternsCategorization("sense", "category") +
                `
                ?category skos:prefLabel ?categoryName .
            }
            LIMIT 25`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);

            const sparqlRecords = SparqlResultParser.parse(sparqlResult);
            const data = sparqlRecords.map(record =>
                DataLoader.getWeightedTerm(record, "category", "categoryName")
            );
            result = result.concat(data === null ? [] : data);
        }
        return result;
    }

    public static async loadEntryInfo(iri: string) {
        let result: SparqlRecord[] = [];

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadEntryInfo", [{ name: "iri", value: iri }]);
            result = result.concat(data === null ? [] : data);
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>        
            PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            SELECT DISTINCT ?group ?entry
            WHERE {
                ?this ?group ?entry .
                MINUS { ?group rdfs:subPropertyOf* skos:hiddenLabel } .
            }
            ORDER BY ?group ?entry ?entryLangTag`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const data = SparqlResultParser.parse(sparqlResult);
            result = result.concat(data === null ? [] : data);
        }
        return result;
    }

    public static async loadEntryPos(iri: string) {
        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadEntryPos", [{ name: "iri", value: iri }]);
            if (data) {
                return data;
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `SELECT ?pos
            WHERE {
                ?this a ?pos .
                FILTER (CONTAINS(STR(?pos), "pos/#")) .
            }
            ORDER BY ?pos
            LIMIT 1`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const records = SparqlResultParser.parse(sparqlResult);
            const data = getFirstValue(records, "pos");
            if (data) {
                return data;
            }
        }
        return null;
    }

    public static async loadEntryWordcloud(iri: string) {
        let result: ITermWeighted[] = [];

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadEntryWordcloud", [
                { name: "iri", value: iri }
            ]);
            result = result.concat(data === null ? [] : data);
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query =
                `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
            PREFIX dcterms: <http://purl.org/dc/terms/>
            PREFIX tree: <https://w3id.org/lemon-tree#>
            SELECT DISTINCT ?category ?categoryName
            WHERE {
                ?this skos:prefLabel ?label .
                ?entry skos:prefLabel ?label .
                ?this a ?pos .
                ?entry a ?pos .
                FILTER (CONTAINS(STR(?pos), "pos/#")) .
                ?sense ontolex:isSenseOf ?entry .
                ` +
                DataLoader.getTriplePatternsCategorization("sense", "category") +
                `
                ?category skos:prefLabel ?categoryName .
            }
            LIMIT 25`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);

            const sparqlRecords = SparqlResultParser.parse(sparqlResult);
            const data = sparqlRecords.map(record =>
                DataLoader.getWeightedTerm(record, "category", "categoryName")
            );
            result = result.concat(data === null ? [] : data);
        }
        return result;
    }

    public static async loadResourceInfo(iri: string) {
        let result: SparqlRecord[] = [];

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadResourceInfo", [
                { name: "iri", value: iri }
            ]);
            result = result.concat(data === null ? [] : data);
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
            SELECT DISTINCT ?group ?entry
            WHERE {
                {
                    ?this ?group ?entry .
                    FILTER (?group NOT IN (rdf:first, rdf:rest)) .
                } UNION {
                    OPTIONAL {
                        SELECT ?entry (CONCAT("List item #", STR(COUNT(distinct ?intraList))) AS ?group)
                        WHERE {
                            ?this rdf:rest*/rdf:first ?entry .
                            ?this rdf:rest* ?intraList .
                            ?intraList rdf:rest*/rdf:first ?entry .
                        }
                        GROUP BY ?entry
                    }
                }
            }
            ORDER BY ?group ?entry`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const data = SparqlResultParser.parse(sparqlResult);
            result = result.concat(data === null ? [] : data);
        }
        return result;
    }

    public static async loadResourceAnnotations(iri: string) {
        let result: SparqlRecord[] = [];

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadResourceAnnotations", [
                { name: "iri", value: iri }
            ]);
            result = result.concat(data === null ? [] : data);
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX oa: <http://www.w3.org/ns/oa#>
            PREFIX dcterms: <http://purl.org/dc/terms/>
            SELECT DISTINCT ?entry ?creation
            WHERE {
                ?entry oa:hasTarget ?this .
                OPTIONAL {
                    ?entry dcterms:created ?creation .
                }
            }
            ORDER BY ?creation ?entry`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const source = sparqlExecutor.getSource();
            const data = SparqlResultParser.parse(sparqlResult, source, undefined);
            result = result.concat(data === null ? [] : data);
        }
        return result;
    }

    public static async loadResourceLabels(iri: string) {
        let result: SparqlRecord[] = [];

        // NOTE: senses do not take labels of their entries into account,
        //       as these labels may not necessarily hold for them

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadResourceLabels", [
                { name: "iri", value: iri }
            ]);
            result = result.concat(data === null ? [] : data);
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
            PREFIX oa: <http://www.w3.org/ns/oa#>
            PREFIX toe: <http://oldenglishthesaurus.arts.gla.ac.uk/>
            SELECT DISTINCT ?entry ?name
            WHERE {
                {
                    ?this a ?entry .
                    ?entry rdfs:label|skos:prefLabel ?name .
                    FILTER (!STRSTARTS(STR(?entry), STR(ontolex:))) .
                    FILTER (!STRSTARTS(STR(?entry), STR(toe:pos))) .
                } UNION {
                    ?entry rdfs:label|skos:prefLabel ?name .
                    FILTER EXISTS {
                        ?annotationBody oa:hasSource ?entry .
                        ?annotation oa:hasBody ?annotationBody .
                        ?annotation oa:hasTarget ?this .
                    }
                }
            }
            ORDER BY ?name ?entry`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const source = sparqlExecutor.getSource();
            const data = SparqlResultParser.parseSimple(sparqlResult, source);
            result = result.concat(data === null ? [] : data);
        }
        return result;
    }

    public static async loadConceptInfo(iri: string) {
        let result: SparqlRecord[] = [];

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadConceptInfo", [
                { name: "iri", value: iri }
            ]);
            result = result.concat(data === null ? [] : data);
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
            PREFIX tree: <https://w3id.org/lemon-tree#>
            SELECT DISTINCT ?group ?entry
            WHERE {
                {
                    ?this ?group ?entry .
                    FILTER (?group NOT IN (skos:broader, skos:narrower)) .
                    MINUS { ?group rdfs:subPropertyOf* skos:hiddenLabel } .
                } UNION {
                    ?entry skos:member ?this .
                    BIND ("Member of" AS ?group) .
                }
            }
            ORDER BY ?group ?entry`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const data = SparqlResultParser.parse(sparqlResult);
            result = result.concat(data === null ? [] : data);
        }
        return result;
    }

    public static async loadConceptListDirect(iri: string) {
        let result: SparqlRecord[] = [];

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadConceptListDirect", [
                { name: "iri", value: iri }
            ]);
            result = result.concat(data === null ? [] : data);
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
            PREFIX oa: <http://www.w3.org/ns/oa#>
            SELECT DISTINCT ?entry
            WHERE {
                {
                    ?entry ontolex:isLexicalizedSenseOf ?this .
                } UNION {
                    ?annotation oa:hasBody/oa:hasSource ?this . 
                    ?annotation oa:hasTarget ?entry . 
                }
                #BIND (?this AS ?group) .
            }
            ORDER BY ?entry`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const data = SparqlResultParser.parse(sparqlResult);
            result = result.concat(data === null ? [] : data);
        }
        return result;
    }

    public static async loadConceptListClosestIndirect(iri: string) {
        let result: SparqlRecord[] = [];

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadConceptListClosestIndirect", [
                { name: "iri", value: iri }
            ]);
            result = result.concat(data === null ? [] : data);
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
            SELECT DISTINCT ?group ?entry
            WHERE {
                ?group skos:broader*/skos:broader ?this .            
                ?entry ontolex:isLexicalizedSenseOf ?group .

                # TOE specific limitation
                ?this skos:notation ?notationThis .
                ?group skos:notation ?notation .
                FILTER (?group = ?this || STRSTARTS(?notation, CONCAT(?notationThis, "/")) ) .
            }
            ORDER BY ?notation ?group ?entry`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const data = SparqlResultParser.parse(sparqlResult);
            result = result.concat(data === null ? [] : data);
        }
        return result;
    }

    public static async loadConceptListCountExtra(iri: string) {
        let result = 0;

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadConceptListCountExtra", [
                { name: "iri", value: iri }
            ]);
            result += data === null ? 0 : parseInt(data, 10);
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
            SELECT DISTINCT (COUNT(DISTINCT ?entry) AS ?count)
            WHERE {
                ?group skos:broader* ?this .            
                ?entry ontolex:isLexicalizedSenseOf ?group .

                # taking into account TOE specific limitation for Concept List
                ?this skos:notation ?notationThis .
                ?group skos:notation ?notation .
                FILTER (!(?group = ?this || STRSTARTS(?notation, CONCAT(?notationThis, "/"))) ) .
            }`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const records = SparqlResultParser.parse(sparqlResult);
            const data = getFirstValue(records, "count");
            result += data === null ? 0 : parseInt(data, 10);
        }
        return result;
    }

    public static async loadConceptStatisticsLexicalizing(iri: string) {
        const statisticsDataService = DataLoader.getMainDataService();
        if (!statisticsDataService) {
            return 0;
        }

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            if (apiExecutor.getSource() == statisticsDataService) {
                const data = await apiExecutor.execute("loadConceptStatisticsLexicalizing", [
                    { name: "iri", value: iri }
                ]);
                return data === null ? 0 : parseInt(data, 10);
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            if (sparqlExecutor.getSource() == statisticsDataService) {
                const query = `PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
                SELECT (COUNT(distinct ?sense) AS ?count)
                WHERE {
                    ?sense ontolex:isLexicalizedSenseOf ?this .
                }`;

                const sparqlResult = await sparqlExecutor.execute(query, [
                    { name: "this", type: "uri", value: iri }
                ]);
                const records = SparqlResultParser.parse(sparqlResult);
                const data = getFirstValue(records, "count");
                return data === null ? 0 : parseInt(data, 10);
            }
        }
        return 0;
    }

    public static async loadConceptStatisticsEvoking(iri: string) {
        const statisticsDataService = DataLoader.getMainDataService();
        if (!statisticsDataService) {
            return 0;
        }

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            if (apiExecutor.getSource() == statisticsDataService) {
                const data = await apiExecutor.execute("loadConceptStatisticsEvoking", [
                    { name: "iri", value: iri }
                ]);
                return data === null ? 0 : parseInt(data, 10);
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            if (sparqlExecutor.getSource() == statisticsDataService) {
                const query =
                    `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
                PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
                PREFIX dcterms: <http://purl.org/dc/terms/>
                PREFIX tree: <https://w3id.org/lemon-tree#>
                SELECT (COUNT(distinct ?sense) AS ?count)
                WHERE {
                    ` +
                    DataLoader.getTriplePatternsCategorization("sense", "concept") +
                    `
                    ?concept skos:broader* ?this .
                }`;

                const sparqlResult = await sparqlExecutor.execute(query, [
                    { name: "this", type: "uri", value: iri }
                ]);
                const records = SparqlResultParser.parse(sparqlResult);
                const data = getFirstValue(records, "count");
                return data === null ? 0 : parseInt(data, 10);
            }
        }
        return 0;
    }

    public static async loadConceptStatisticsPerPos(iri: string) {
        const statisticsDataService = DataLoader.getMainDataService();
        if (!statisticsDataService) {
            return null;
        }

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            if (apiExecutor.getSource() == statisticsDataService) {
                const data = await apiExecutor.execute("loadConceptStatisticsPerPos", [
                    { name: "iri", value: iri }
                ]);
                return data;
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            if (sparqlExecutor.getSource() == statisticsDataService) {
                const query =
                    `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
                PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
                PREFIX dcterms: <http://purl.org/dc/terms/>
                PREFIX tree: <https://w3id.org/lemon-tree#>
                SELECT ?iri ?label (COUNT(distinct ?sense) AS ?value)
                WHERE {
                    ` +
                    DataLoader.getTriplePatternsCategorization("sense", "concept") +
                    `
                    ?concept skos:broader* ?this .
                    ?sense ontolex:isSenseOf/rdf:type ?pos .
                    FILTER (CONTAINS(STR(?pos), "pos/#")) .
                    ?pos skos:prefLabel ?label .
                    BIND (?pos AS ?iri) .
                }
                GROUP BY ?iri ?label`;

                const sparqlResult = await sparqlExecutor.execute(query, [
                    { name: "this", type: "uri", value: iri }
                ]);
                const data = SparqlResultParser.parseSimpleWithCount(sparqlResult, "value");
                return data;
            }
        }
        return null;
    }

    public static async loadConceptStatisticsPerSub(iri: string) {
        const statisticsDataService = DataLoader.getMainDataService();
        if (!statisticsDataService) {
            return null;
        }

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            if (apiExecutor.getSource() == statisticsDataService) {
                const data = await apiExecutor.execute("loadConceptStatisticsPerSub", [
                    { name: "iri", value: iri }
                ]);
                return data;
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            if (sparqlExecutor.getSource() == statisticsDataService) {
                const query =
                    `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
                PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
                PREFIX dcterms: <http://purl.org/dc/terms/>
                PREFIX tree: <https://w3id.org/lemon-tree#>
                SELECT ?iri ?label (COUNT(distinct ?sense) AS ?value)
                WHERE {
                    ` +
                    DataLoader.getTriplePatternsCategorization("sense", "concept") +
                    `
                    ?concept skos:broader* ?sub .
                    {
                        FILTER (?this != "evoke:concept:all") .
                        ?sub skos:broader ?this .
                    } UNION {
                        FILTER (?this = "evoke:concept:all") .
                        ?sub skos:topConceptOf|^skos:hasTopConcept ?conceptScheme .
                    }
                    ?sub skos:prefLabel ?label .
                    BIND (?sub AS ?iri) .
                }
                GROUP BY ?iri ?label`;

                const sparqlResult = await sparqlExecutor.execute(query, [
                    { name: "this", type: "uri", value: iri }
                ]);
                const data = SparqlResultParser.parseSimpleWithCount(sparqlResult, "value");
                return data;
            }
        }
        return null;
    }

    public static async loadConceptWordcloud(iri: string) {
        let result: ITermWeighted[] = [];

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadConceptWordcloud", [
                { name: "iri", value: iri }
            ]);
            result = result.concat(data === null ? [] : data);
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
            SELECT ?sense ?senseName ?level
            WHERE {
                { 
                    SELECT ?sense ?level
                    WHERE {
                        ?sense ontolex:isLexicalizedSenseOf ?category .
                        BIND (0 AS ?level) .
                    }
                } UNION {
                    SELECT ?sense ?level
                    WHERE {
                        ?sense ontolex:isLexicalizedSenseOf/skos:broader+ ?category .
                        BIND (1 AS ?level) .
                    }
                    LIMIT 25
                }
                ?sense skos:prefLabel ?senseName .
            }
            ORDER BY ?level
            LIMIT 25`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "category", type: "uri", value: iri }
            ]);

            const sparqlRecords = SparqlResultParser.parse(sparqlResult);
            const data = sparqlRecords.map(record =>
                DataLoader.getWeightedTerm(record, "sense", "senseName")
            );
            result = result.concat(data === null ? [] : data);
        }
        return result;
    }

    public static async loadConceptWordcloudAssociatedConcepts(iri: string) {
        let result: ITermWeighted[] = [];

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadConceptWordcloudAssociatedConcepts", [
                { name: "iri", value: iri }
            ]);
            result = result.concat(data === null ? [] : data);
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
            SELECT DISTINCT ?concept ?conceptName ?level
            WHERE {
                { 
                    SELECT ?sense ?level
                    WHERE {
                        ?sense ontolex:isLexicalizedSenseOf ?category .
                        BIND (0 AS ?level) .
                    }
                } UNION {
                    SELECT ?sense ?level
                    WHERE {
                        ?sense ontolex:isLexicalizedSenseOf/skos:broader+ ?category .
                        BIND (1 AS ?level) .
                    }
                    LIMIT 25
                }
                ?sense ontolex:isSenseOf/^ontolex:isSenseOf ?otherSense .
                FILTER (?otherSense != ?sense) .
                ?otherSense ontolex:isLexicalizedSenseOf ?concept .
                ?concept skos:prefLabel ?conceptName .
            }
            ORDER BY ?level
            LIMIT 25`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "category", type: "uri", value: iri }
            ]);

            const sparqlRecords = SparqlResultParser.parse(sparqlResult);
            const data = sparqlRecords.map(record =>
                DataLoader.getWeightedTerm(record, "concept", "conceptName")
            );
            result = result.concat(data === null ? [] : data);
        }
        return result;
    }

    private static getWeightedTerm(
        record: SparqlRecord,
        varIri: string,
        varName: string
    ): ITermWeighted {
        const result = {
            term: TermBuilder.parseFromSparqlRecord(record, varIri, varName),
            weight: 1
        };
        return result;
    }

    public static escapeRegExp(s: string) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
    }

    public static async loadSearchResults(searchKey: string, options: SearchOptions = {}) {
        const { limit, type, sort } = options;
        if (!searchKey || searchKey.length == 0) {
            return null;
        }

        let result: SparqlRecord[] = [];

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadSearchResults", [
                { name: "searchKey", value: searchKey },
                { name: "options", value: JSON.stringify(options) }
            ]);
            result = result.concat(data === null ? [] : data);
        }

        const regexPattern = DataLoader.escapeRegExp(searchKey).replace("\\*", "[^\\\\s]*");

        const groupTypes = new Array();
        if (!type || type == "concept") {
            groupTypes.push("skos:Concept");
            groupTypes.push("ontolex:LexicalConcept");
        }
        if (!type || type == "sense") {
            groupTypes.push("ontolex:LexicalSense");
        }
        if (type && type == "entry") {
            groupTypes.push("ontolex:LexicalEntry");
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query =
                `PREFIX fti: <http://franz.com/ns/allegrograph/2.2/textindex/>  ### AGRAPH TEXT INDEX SEARCH
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
            PREFIX dcterms: <http://purl.org/dc/terms/>
            PREFIX tree: <https://w3id.org/lemon-tree#>
            PREFIX toe: <http://oldenglishthesaurus.arts.gla.ac.uk/>
            SELECT DISTINCT ?group ?entry ?superentry ?concept
            WHERE {
                (?entry ?o) fti:match ?searchKey .  ### AGRAPH OPTIMIZATION

                ?entry a ?group .
                FILTER (?group IN (` +
                groupTypes.join() +
                `)) .

                OPTIONAL {
                    ?entry skos:prefLabel|rdfs:label ?label .
                    BIND (STRLEN(STR(?label)) AS ?labelLength) .
                }
                OPTIONAL {
                    ` +
                DataLoader.getTriplePatternsLexicalization("entry", "concept") +
                `
                }
                OPTIONAL {
                    ?entry ontolex:isSenseOf ?superentry .
                    OPTIONAL {
                        ?superentry toe:orderLabel ?orderLabel .
                    }
                }
            } \r\n` +
                (sort && sort == "az"
                    ? `ORDER BY ?group ?orderLabel ?label ?labelLength ?superentry ?entry ?concept \r\n`
                    : `ORDER BY ?group ?labelLength ?orderLabel ?label ?superentry ?entry ?concept \r\n`) +
                (limit && limit > 0 ? `LIMIT ` + (limit + 1) : ``);

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "searchKey", type: "text", value: searchKey },
                { name: "regexPattern", type: "text", value: regexPattern }
            ]);
            const data = SparqlResultParser.parse(sparqlResult);
            result = result.concat(data === null ? [] : data);
        }
        return result;
    }

    public static async loadEntryList(iri: string) {
        let result: SparqlRecord[] = [];

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadEntryList", [{ name: "iri", value: iri }]);
            result = result.concat(data === null ? [] : data);
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query =
                `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
            PREFIX dcterms: <http://purl.org/dc/terms/>
            PREFIX tree: <https://w3id.org/lemon-tree#>
            SELECT DISTINCT ?group ?entry
            WHERE {
                ?entry ontolex:isSenseOf ?this .
                ` +
                DataLoader.getTriplePatternsLexicalization("entry", "group") +
                `
            }
            ORDER BY ?group ?entry`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const data = SparqlResultParser.parse(sparqlResult);
            result = result.concat(data === null ? [] : data);
        }
        return result;
    }

    public static async loadSenseList(iri: string) {
        let result: SparqlRecord[] = [];

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            const data = await apiExecutor.execute("loadSenseList", [{ name: "iri", value: iri }]);
            result = result.concat(data === null ? [] : data);
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            const query =
                `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
            PREFIX dcterms: <http://purl.org/dc/terms/>
            PREFIX tree: <https://w3id.org/lemon-tree#>
            SELECT DISTINCT ?group ?entry
            WHERE {
                ?this skos:prefLabel ?label .
                ?entry skos:prefLabel ?label .
                ?this ontolex:isSenseOf*/a ?pos .
                ?entry ontolex:isSenseOf*/a ?pos .
                FILTER (CONTAINS(STR(?pos), "pos/#")) .
                ` +
                DataLoader.getTriplePatternsLexicalization("entry", "group") +
                `
                BIND (IF(?entry = ?this, 0, 1) AS ?isOtherSense) .
            }
            ORDER BY ?isOtherSense ?group ?entry`;

            const sparqlResult = await sparqlExecutor.execute(query, [
                { name: "this", type: "uri", value: iri }
            ]);
            const data = SparqlResultParser.parse(sparqlResult);
            result = result.concat(data === null ? [] : data);
        }
        return result;
    }

    // see also JSON-LD playground @ https://json-ld.org/playground/#startTab=tab-nquads&json-ld=%7B%22%40context%22%3A%5B%22http%3A%2F%2Fwww.w3.org%2Fns%2Fanno.jsonld%22%2C%7B%22content%22%3A%7B%22%40container%22%3A%22%40index%22%2C%22%40id%22%3A%22%40graph%22%7D%7D%5D%2C%22content%22%3A%7B%22Annotation%22%3A%5B%7B%22type%22%3A%22Annotation%22%2C%22id%22%3A%22https%3A%2F%2Fw3id.org%2Fevoke%2Fid%2Fannotation%2F9596ec9e-e22a-4162-9a16-78bfc5aca1f0%22%2C%22created%22%3A%222019-12-24T14%3A22%3A23.458Z%22%2C%22motivation%22%3A%22tagging%22%7D%5D%2C%22Concept%22%3A%5B%5D%2C%22LexicalConcept%22%3A%5B%5D%2C%22LexicalEntry%22%3A%5B%5D%2C%22LexicalSense%22%3A%5B%5D%7D%7D .
    public static async addAnnotation(
        targetIRI: string,
        textBody: string,
        datasetURI?: string
    ): Promise<string | null> {
        // always local?
        if (!textBody) {
            return null;
        }

        const localLD = localStorage.getItem(LOCAL_STORAGE_DATASET) || "";
        const annotationIRI =
            "https://w3id.org/evoke/id/annotation/" + RandomHelper.getRandomUUID();
        const annotationBodyIRI = annotationIRI + "-body";
        const creationTime = new Date().toISOString();

        const hashtags = (twitterText as any).default.extractHashtags(textBody);
        // console.log(hashtags);

        const labelIRIs = [];
        for (const hashtag of hashtags) {
            const labelIRI = "https://w3id.org/evoke/id/concept/" + hashtag;
            labelIRIs.push(labelIRI);
        }

        try {
            // Assume JSON-LD
            const jsonld = localLD != "" ? JSON.parse(localLD) : {};
            if (!jsonld["@context"]) {
                jsonld["@context"] = [
                    "http://www.w3.org/ns/anno.jsonld",
                    {
                        skos: "http://www.w3.org/2004/02/skos/core#",
                        Concept: "skos:Concept",
                        prefLabel: "skos:prefLabel"
                    },
                    //                    { "content": { "@id": "@graph", "@container": "@index" }}
                    { content: { "@reverse": "rdfs:isDefinedBy", "@container": "@index" } }
                ];
            }
            const annotation: any = {
                id: annotationIRI,
                type: "Annotation",
                created: creationTime,
                motivation: "commenting",
                target: targetIRI,
                bodyValue: textBody
            };
            if (labelIRIs.length > 0) {
                annotation.body = {
                    id: annotationBodyIRI,
                    type: "SpecificResource",
                    source: labelIRIs,
                    purpose: "tagging"
                };
            }
            if (!jsonld.content) {
                jsonld.content = {};
            }
            if (!jsonld.content.Annotation) {
                jsonld.content.Annotation = [];
            }
            jsonld.content.Annotation.push(annotation);
            if (!jsonld.content.Concept) {
                jsonld.content.Concept = [];
            }
            for (const hashtag of hashtags) {
                const labelIRI = "https://w3id.org/evoke/id/concept/" + hashtag;
                if (
                    !jsonld.content.Concept.find(
                        (concept: any) => concept.id && concept.id == labelIRI
                    )
                ) {
                    const concept = {
                        id: labelIRI,
                        type: "Concept",
                        prefLabel: hashtag
                    };
                    jsonld.content.Concept.push(concept);
                }
            }
            LocalData.repopulateWith(JSON.stringify(jsonld));
        } catch (e) {
            // Else, try N3
            let triples =
                `
<` +
                annotationIRI +
                `> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/oa#Annotation> .
<` +
                annotationIRI +
                `> <http://www.w3.org/ns/oa#bodyValue> """` +
                textBody.replace(/"""/g, '\\"\\"\\"') +
                `""" .
<` +
                annotationIRI +
                `> <http://www.w3.org/ns/oa#hasTarget> <` +
                targetIRI +
                `> .
<` +
                annotationIRI +
                `> <http://www.w3.org/ns/oa#motivation> <http://www.w3.org/ns/oa#commenting> .
<` +
                annotationIRI +
                `> <http://purl.org/dc/terms/created> "` +
                creationTime +
                `"^^<http://www.w3.org/2001/XMLSchema#dateTime> .`;
            if (hashtags.length > 0) {
                triples +=
                    `
<` +
                    annotationIRI +
                    `> <http://www.w3.org/ns/oa#hasBody> <` +
                    annotationBodyIRI +
                    `> .
<` +
                    annotationBodyIRI +
                    `> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/oa#SpecificResource> .
<` +
                    annotationBodyIRI +
                    `> <http://www.w3.org/ns/oa#purpose> <http://www.w3.org/ns/oa#tagging> .`;
                for (const hashtag of hashtags) {
                    const labelIRI = "https://w3id.org/evoke/id/concept/" + hashtag;
                    triples +=
                        `
<` +
                        annotationBodyIRI +
                        `> <http://www.w3.org/ns/oa#hasSource> <` +
                        labelIRI +
                        `> .
<` +
                        labelIRI +
                        `> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/2004/02/skos/core#Concept> .
<` +
                        labelIRI +
                        `> <http://www.w3.org/2004/02/skos/core#prefLabel>  """` +
                        hashtag +
                        `""" .`;
                }
            }
            LocalData.repopulateWith(localLD + triples);
        }

        return annotationIRI;
    }

    public static async removeAnnotation(annotationIRI: string, datasetIRI?: string) {
        // default = local
        if (!annotationIRI) {
            return;
        }

        let localLD = localStorage.getItem(LOCAL_STORAGE_DATASET) || "";
        try {
            // First try JSON-LD
            const jsonld = JSON.parse(localLD);
            if (jsonld.content && jsonld.content.Annotation) {
                jsonld.content.Annotation = jsonld.content.Annotation.filter(
                    (annotation: any) => annotation.id && annotation.id != annotationIRI
                );
            }
            LocalData.repopulateWith(JSON.stringify(jsonld));
        } catch (e) {
            // Try N3
            const regexp = ".*<" + escapeRegExp(annotationIRI) + "(-body)?" + ">.*";
            localLD = localLD.replace(new RegExp(regexp, "gm"), "");
            LocalData.repopulateWith(localLD);
        }
    }

    public static async loadAvailableLanguages(type: string, inStatisticsOnly = false) {
        const statisticsDataService = DataLoader.getMainDataService();
        if (inStatisticsOnly && !statisticsDataService) {
            return null;
        }

        let result: SparqlRecord[] = [];

        const typeIRI =
            type == "concept"
                ? ONTOLEX + "LexicalConcept"
                : type == "sense"
                    ? ONTOLEX + "LexicalSense"
                    : type == "entry"
                        ? ONTOLEX + "LexicalEntry"
                        : null;

        if (typeIRI == null) {
            return [];
        }

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            if (!inStatisticsOnly || apiExecutor.getSource() == statisticsDataService) {
                const data = await apiExecutor.execute("loadAvailableLanguages", [
                    { name: "type", value: type }
                ]);
                result = result.concat(data === null ? [] : data);
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            if (!inStatisticsOnly || sparqlExecutor.getSource() == statisticsDataService) {
                const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
                SELECT DISTINCT ?entry
                WHERE {
                    ?item a/rdfs:subClassOf* ?type .
                    ?item skos:prefLabel ?label .
                    BIND (LANG(?label) AS ?entry) .
                }
                ORDER BY ?entry`;

                const sparqlResult = await sparqlExecutor.execute(query, [
                    { name: "type", type: "uri", value: typeIRI }
                ]);
                const source = sparqlExecutor.getSource();
                const data = SparqlResultParser.parseSimple(sparqlResult, source);
                result = result.concat(data === null ? [] : data);
            }
        }

        DataLoader.addLanguageNames(result, "entry", "name");
        return result;
    }

    protected static addLanguageNames(records: any, varLangTag: string, varLangName: string): void {
        for (const record of records) {
            const langTag = record[varLangTag] as string;
            if (langTag && !record[varLangName]) {
                record[varLangName] = LanguageHelper.getLanguageName(langTag);
            }
        }
    }

    public static async loadAvailableLabels(type: string, inStatisticsOnly = false) {
        const statisticsDataService = DataLoader.getMainDataService();
        if (inStatisticsOnly && !statisticsDataService) {
            return null;
        }

        let result: SparqlRecord[] = [];

        // NOTE: senses do not take labels of their entries into account,
        //       as these labels may not necessarily hold for them

        const typeIRI =
            type == "concept"
                ? ONTOLEX + "LexicalConcept"
                : type == "sense"
                    ? ONTOLEX + "LexicalSense"
                    : type == "entry"
                        ? ONTOLEX + "LexicalEntry"
                        : null;

        if (typeIRI == null) {
            return [];
        }

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            if (!inStatisticsOnly || apiExecutor.getSource() == statisticsDataService) {
                const data = await apiExecutor.execute("loadAvailableLabels", [
                    { name: "type", value: type }
                ]);
                result = result.concat(data === null ? [] : data);
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            if (!inStatisticsOnly || sparqlExecutor.getSource() == statisticsDataService) {
                const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
                PREFIX oa: <http://www.w3.org/ns/oa#>
                PREFIX toe: <http://oldenglishthesaurus.arts.gla.ac.uk/>
                SELECT DISTINCT ?entry ?name
                WHERE {
                    {
                        ?entry rdfs:label|skos:prefLabel ?name .
                        FILTER (?entry != ?type) .
                        FILTER EXISTS {
                            ?item a ?entry .
                            ?item a/rdfs:subClassOf* ?type .
                        }
                        FILTER NOT EXISTS {
                            ?entry rdfs:subClassOf* toe:pos .
                        }
                    } UNION {
                        ?entry rdfs:label|skos:prefLabel ?name .
                        FILTER EXISTS {
                            ?annotationBody oa:hasSource ?entry .
                            ?annotation oa:hasBody ?annotationBody .
                            ?annotation oa:hasTarget ?item .
                            ?item a/rdfs:subClassOf* ?type .
                        }
                    }
                }
                ORDER BY ?name ?entry`;

                const sparqlResult = await sparqlExecutor.execute(query, [
                    { name: "type", type: "uri", value: typeIRI }
                ]);
                const source = sparqlExecutor.getSource();
                const data = SparqlResultParser.parseSimple(sparqlResult, source);
                result = result.concat(data === null ? [] : data);
            }
        }
        return result;
    }

    public static async loadAvailablePos(inStatisticsOnly = false) {
        const statisticsDataService = DataLoader.getMainDataService();
        if (inStatisticsOnly && !statisticsDataService) {
            return null;
        }

        let result: SparqlRecord[] = [];

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            if (!inStatisticsOnly || apiExecutor.getSource() == statisticsDataService) {
                const data = await apiExecutor.execute("loadAvailablePos", []);
                result = result.concat(data === null ? [] : data);
            }
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            if (!inStatisticsOnly || sparqlExecutor.getSource() == statisticsDataService) {
                const query = `PREFIX rdf: <http://www.w3.org/2000/01/rdf-schema#>
                PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
                PREFIX toe: <http://oldenglishthesaurus.arts.gla.ac.uk/>
                SELECT DISTINCT ?entry ?name
                WHERE {
                    ?entry rdfs:subClassOf toe:pos .
                    ?entry skos:prefLabel ?name .
                    FILTER EXISTS {
                        ?entry rdfs:subClassOf toe:pos .
                        ?item a ?entry .
                    }
                }
                ORDER BY ?name ?entry`;

                const sparqlResult = await sparqlExecutor.execute(query, []);
                const source = sparqlExecutor.getSource();
                const data = SparqlResultParser.parseSimple(sparqlResult, source);
                result = result.concat(data === null ? [] : data);
            }
        }
        return result;
    }

    /* 
        Count (i.e., of a lexical entry or sense with given features)
        NOTE: Statistics can be drawn from only a single DataService.
              Results will therefore be returned from the first DataService available. 
    */
    public static async loadItemStatisticsCount(type: string, features: any, conceptIRI?: string) {
        return DataLoader.loadItemStatisticsTypeCount(type, features, type, conceptIRI);
    }

    /* 
        Count (i.e., of a lexical entry or sense with given features)
        NOTE: Statistics can be drawn from only a single DataService.
              Results will therefore be returned from the first DataService available. 
    */
    public static async loadItemStatisticsTypeCount(
        type: string,
        features: any,
        resultType: string,
        conceptIRI?: string
    ) {
        const statisticsDataService = DataLoader.getMainDataService();
        if (!statisticsDataService) {
            return null;
        }

        const typeIRI =
            type == "sense"
                ? ONTOLEX + "LexicalSense"
                : type == "entry"
                    ? ONTOLEX + "LexicalEntry"
                    : null;

        if (typeIRI == null) {
            return null;
        }

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            if (apiExecutor.getSource() == statisticsDataService) {
                const data = await apiExecutor.execute("loadItemStatisticsTypeCount", [
                    { name: "type", value: type },
                    { name: "features", value: features },
                    { name: "resultType", value: resultType },
                    { name: "conceptIRI", value: conceptIRI }
                ]);
                return data;
            }
        }

        const featureTriplePatterns = DataLoader.getTriplePatternsFeatures(features, type);
        if (featureTriplePatterns === null) {
            return null;
        }

        const resultTypeTriplePatterns =
            resultType == type
                ? `BIND (?item AS ?resultItem) .`
                : `?item ` +
                  (resultType == "sense" ? `^` : ``) +
                  `<` +
                  ONTOLEX +
                  `isSenseOf> ?resultItem .`;

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            if (sparqlExecutor.getSource() == statisticsDataService) {
                const query =
                    `SELECT (COUNT(distinct ?resultItem) AS ?count)
                WHERE {
                    ?item a ?type .
                    FILTER EXISTS {
                        ?item a ?type .
                        ` +
                    featureTriplePatterns +
                    `
                        ` +
                    (!conceptIRI
                        ? ``
                        : DataLoader.getTriplePatternsCategorization("item", "concept", type)) +
                    `
                    }
                    ` +
                    resultTypeTriplePatterns +
                    `
                }`;

                const sparqlResult = await sparqlExecutor.execute(query, [
                    { name: "type", type: "uri", value: typeIRI },
                    { name: "concept", type: "uri", value: conceptIRI || "" }
                ]);
                const data = SparqlResultParser.parseSimpleWithCount(sparqlResult, "count");
                return data;
            }
        }
        return null;
    }

    /* 
        Degree of ambiguity of a word (i.e., of a lexical entry or sense with given features)
        NOTE: Statistics can be drawn from only a single DataService.
              Results will therefore be returned from the first DataService available. 
    */
    public static async loadItemStatisticsAmbiguity(
        type: string,
        features: any,
        conceptIRI?: string
    ) {
        const statisticsDataService = DataLoader.getMainDataService();
        if (!statisticsDataService) {
            return null;
        }

        const typeIRI =
            type == "sense"
                ? ONTOLEX + "LexicalSense"
                : type == "entry"
                    ? ONTOLEX + "LexicalEntry"
                    : null;

        if (typeIRI == null) {
            return null;
        }

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            if (apiExecutor.getSource() == statisticsDataService) {
                const data = await apiExecutor.execute("loadItemStatisticsAmbiguity", [
                    { name: "type", value: type },
                    { name: "features", value: features },
                    { name: "conceptIRI", value: conceptIRI }
                ]);
                return data;
            }
        }

        const featureTriplePatterns = DataLoader.getTriplePatternsFeatures(features, type);
        if (featureTriplePatterns === null) {
            return null;
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            if (sparqlExecutor.getSource() == statisticsDataService) {
                const query =
                    `PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
                SELECT ?senseCount (COUNT(?entry) AS ?count)
                WHERE {
                    {
                        SELECT (COUNT(?sense) AS ?senseCount) ?entry
                        WHERE {
                            {
                                SELECT DISTINCT ?entry
                                WHERE {
                                    # select item adhering to features
                                    ?item a ?type .
                                    FILTER EXISTS {
                                        ?item a ?type .
                                        ` +
                    featureTriplePatterns +
                    `
                                        ` +
                    (!conceptIRI
                        ? ``
                        : DataLoader.getTriplePatternsCategorization("item", "concept", type)) +
                    `
                                    }
                                    
                                    # select lexical entry
                                    ?item ontolex:isSenseOf? ?entry .
                                    ?entry a ontolex:LexicalEntry .
                                }
                            }
                            
                            # retrieving degree of ambiguity
                            ?sense ontolex:isSenseOf ?entry .
                        }
                        GROUP BY ?entry
                    }
                }
                GROUP BY ?senseCount
                ORDER BY ?senseCount`;

                const sparqlResult = await sparqlExecutor.execute(query, [
                    { name: "type", type: "uri", value: typeIRI },
                    { name: "concept", type: "uri", value: conceptIRI || "" }
                ]);
                const data = SparqlResultParser.parseSimpleWithCount(sparqlResult, "count");
                return data;
            }
        }
        return null;
    }

    /* 
        Degree of ambiguity of a word (i.e., of a lexical entry or sense with given features)
        NOTE: Statistics can be drawn from only a single DataService.
              Results will therefore be returned from the first DataService available. 
    */
    public static async loadItemStatisticsSynonymy(
        type: string,
        features: any,
        conceptIRI?: string
    ) {
        const statisticsDataService = DataLoader.getMainDataService();
        if (!statisticsDataService) {
            return null;
        }

        const typeIRI =
            type == "sense"
                ? ONTOLEX + "LexicalSense"
                : type == "entry"
                    ? ONTOLEX + "LexicalEntry"
                    : null;

        if (typeIRI == null) {
            return null;
        }

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            if (apiExecutor.getSource() == statisticsDataService) {
                const data = await apiExecutor.execute("loadItemStatisticsSynonymy", [
                    { name: "type", value: type },
                    { name: "features", value: features },
                    { name: "conceptIRI", value: conceptIRI }
                ]);
                return data;
            }
        }

        const featureTriplePatterns = DataLoader.getTriplePatternsFeatures(features, type);
        if (featureTriplePatterns === null) {
            return null;
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            if (sparqlExecutor.getSource() == statisticsDataService) {
                const query =
                    `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
                PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
                SELECT ?synonymCount (COUNT(?sense) AS ?count)
                WHERE {
                    {
                        SELECT (COUNT(?synonym) AS ?synonymCount) ?sense
                        WHERE {
                            {
                                SELECT DISTINCT ?sense
                                WHERE {
                                    # select item adhering to features
                                    ?item a ?type .
                                    FILTER EXISTS {
                                        ?item a ?type .
                                        ` +
                    featureTriplePatterns +
                    `
                                        ` +
                    (!conceptIRI
                        ? ``
                        : DataLoader.getTriplePatternsCategorization("item", "concept", type)) +
                    `
                                    }
                                    
                                    # select lexical sense
                                    ?sense ontolex:isSenseOf? ?item .
                                    ?sense a ontolex:LexicalSense .
                                    ?sense skos:prefLabel ?senseLabel .
                                    BIND (LANG(?senseLabel) AS ?senseLang) .
                                }
                            }
                            OPTIONAL {
                                # select synonym
                                ?sense ontolex:isLexicalizedSenseOf/^ontolex:isLexicalizedSenseOf ?synonym .
                                FILTER (?synonym != ?sense) .
                                ?synonym skos:prefLabel ?synonymLabel .
                                FILTER (LANG(?synonymLabel) = ?senseLang) .
                            }
                        }
                        GROUP BY ?sense
                    }
                }
                GROUP BY ?synonymCount
                ORDER BY ?synonymCount`;

                const sparqlResult = await sparqlExecutor.execute(query, [
                    { name: "type", type: "uri", value: typeIRI },
                    { name: "concept", type: "uri", value: conceptIRI || "" }
                ]);
                const data = SparqlResultParser.parseSimpleWithCount(sparqlResult, "count");
                return data;
            }
        }
        return null;
    }

    /* 
        Tree depth of a word (i.e., of a lexical entry or sense with given features)
        NOTE: Statistics can be drawn from only a single DataService.
              Results will therefore be returned from the first DataService available. 
    */
    public static async loadItemStatisticsTreeDepth(
        type: string,
        features: any,
        conceptIRI?: string
    ) {
        const statisticsDataService = DataLoader.getMainDataService();
        if (!statisticsDataService) {
            return null;
        }

        const typeIRI =
            type == "sense"
                ? ONTOLEX + "LexicalSense"
                : type == "entry"
                    ? ONTOLEX + "LexicalEntry"
                    : null;

        if (typeIRI == null) {
            return null;
        }

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            if (apiExecutor.getSource() == statisticsDataService) {
                const data = await apiExecutor.execute("loadItemStatisticsTreeDepth", [
                    { name: "type", value: type },
                    { name: "features", value: features },
                    { name: "conceptIRI", value: conceptIRI }
                ]);
                return data;
            }
        }

        const featureTriplePatterns = DataLoader.getTriplePatternsFeatures(features, type);
        if (featureTriplePatterns === null) {
            return null;
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            if (sparqlExecutor.getSource() == statisticsDataService) {
                const query =
                    `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
                PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
                
                SELECT ?depth (COUNT(?sense) AS ?count)
                WHERE {
                    SELECT ?sense (COUNT(?ancestorConcept) AS ?depth)
                    WHERE {
                        # select item adhering to features
                        ?item a ?type .
                        
                        FILTER EXISTS {
                            ?item a ?type .
                            ` +
                    featureTriplePatterns +
                    `
                        }

                        # retrieving tree depth for item (or its senses)` +
                    (type == "sense"
                        ? `
                        BIND (?item AS ?sense) .`
                        : `
                        ?sense ontolex:isSenseOf ?item .`) +
                    `
                        
                        ` +
                    DataLoader.getTriplePatternsLexicalization("sense", "directConcept") +
                    `
                        ?directConcept skos:broader* ?ancestorConcept .
                        ` +
                    (!conceptIRI
                        ? ``
                        : `FILTER EXISTS {
                            ?directConcept skos:broader* ?concept .
                        }`) +
                    `
                    }
                    GROUP BY ?item ?sense ?directConcept
                }
                GROUP BY ?depth
                ORDER BY ?depth`;

                const sparqlResult = await sparqlExecutor.execute(query, [
                    { name: "type", type: "uri", value: typeIRI },
                    { name: "concept", type: "uri", value: conceptIRI || "" }
                ]);
                const data = SparqlResultParser.parseSimpleWithCount(sparqlResult, "count");
                return data;
            }
        }
        return null;
    }

    /* 
        Conceptual depth of a word (i.e., of a lexical entry or sense with given features)
        NOTE: Statistics can be drawn from only a single DataService.
              Results will therefore be returned from the first DataService available. 
    */
    public static async loadItemStatisticsConceptualDepth(
        type: string,
        features: any,
        conceptIRI?: string
    ) {
        const statisticsDataService = DataLoader.getMainDataService();
        if (!statisticsDataService) {
            return null;
        }

        const typeIRI =
            type == "sense"
                ? ONTOLEX + "LexicalSense"
                : type == "entry"
                    ? ONTOLEX + "LexicalEntry"
                    : null;

        if (typeIRI == null) {
            return null;
        }

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            if (apiExecutor.getSource() == statisticsDataService) {
                const data = await apiExecutor.execute("loadItemStatisticsConceptualDepth", [
                    { name: "type", value: type },
                    { name: "features", value: features },
                    { name: "conceptIRI", value: conceptIRI }
                ]);
                return data;
            }
        }

        const featureTriplePatterns = DataLoader.getTriplePatternsFeatures(features, type);
        if (featureTriplePatterns === null) {
            return null;
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            if (sparqlExecutor.getSource() == statisticsDataService) {
                const query =
                    `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
                PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
                PREFIX tree: <https://w3id.org/lemon-tree#>
                SELECT ?depth (COUNT(distinct ?item) AS ?count)
                WHERE {
                    # select item adhering to features
                    ?item a ?type .
                    FILTER EXISTS {
                        ?item a ?type .
                        ` +
                    featureTriplePatterns +
                    `
                    }
                    
                    # retrieving conceptual depth for item (or its senses)
                    OPTIONAL {` +
                    (type == "sense"
                        ? `
                        BIND (?item AS ?sense) .`
                        : `
                        ?sense ontolex:isSenseOf ?item .`) +
                    `
                        {
                            ` +
                    DataLoader.getTriplePatternsLexicalization("sense", "directConcept") +
                    `
                            ?categoryType skos:member ?directConcept .
                            ?categoryType tree:conceptualDepth ?specifiedDepth .
                        } UNION {
                            ` +
                    DataLoader.getTriplePatternsLexicalization("sense", "directConcept") +
                    `
                            ?directConcept tree:conceptualDepth ?specifiedDepth .
                        }
                        ` +
                    (!conceptIRI
                        ? ``
                        : `FILTER EXISTS {
                            ?directConcept skos:broader* ?concept .
                        }`) +
                    `
                    }
                    BIND (COALESCE(?specifiedDepth, -1) AS ?depth) .
                }
                GROUP BY ?depth
                ORDER BY ?depth`;

                const sparqlResult = await sparqlExecutor.execute(query, [
                    { name: "type", type: "uri", value: typeIRI },
                    { name: "concept", type: "uri", value: conceptIRI || "" }
                ]);
                const data = SparqlResultParser.parseSimpleWithCount(sparqlResult, "count");
                return data;
            }
        }
        return null;
    }

    /* 
        Distribution over concepts of senses (based on a lexical entry or sense with given features).
        NOTE: Statistics can be drawn from only a single DataService.
              Results will therefore be returned from the first DataService available. 
    */
    public static async loadItemStatisticsConceptDistribution(
        type: string,
        features: any,
        conceptIRI = "evoke:concept:all"
    ) {
        const statisticsDataService = DataLoader.getMainDataService();
        if (!statisticsDataService) {
            return null;
        }

        const typeIRI =
            type == "sense"
                ? ONTOLEX + "LexicalSense"
                : type == "entry"
                    ? ONTOLEX + "LexicalEntry"
                    : null;

        if (typeIRI == null) {
            return null;
        }

        const apiExecutors = resolveInjectArray(IApiExecutor);
        for (const apiExecutor of apiExecutors) {
            if (apiExecutor.getSource() == statisticsDataService) {
                const data = await apiExecutor.execute("loadItemStatisticsConceptDistribution", [
                    { name: "type", value: type },
                    { name: "features", value: features },
                    { name: "conceptIRI", value: conceptIRI }
                ]);
                return data;
            }
        }

        const featureTriplePatterns = DataLoader.getTriplePatternsFeatures(features, type);
        if (featureTriplePatterns === null) {
            return null;
        }

        const sparqlExecutors = resolveInjectArray(ISparqlExecutor);
        for (const sparqlExecutor of sparqlExecutors) {
            if (sparqlExecutor.getSource() == statisticsDataService) {
                const query =
                    `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
                PREFIX ontolex: <http://www.w3.org/ns/lemon/ontolex#>
                PREFIX dcterms: <http://purl.org/dc/terms/>
                PREFIX tree: <https://w3id.org/lemon-tree#>
                SELECT ?iri ?label (COUNT(distinct ?sense) AS ?value)
                WHERE {
                    # select subconcepts
                    {
                        FILTER (?concept != <evoke:concept:all>) .
                        ?sub skos:broader ?concept .
                    } UNION {
                        FILTER (?concept = <evoke:concept:all>) .
                        ?sub skos:topConceptOf|^skos:hasTopConcept ?skosConceptScheme .
                    }
                    ?sub skos:prefLabel ?label .
                    BIND (?sub AS ?iri) .

                    OPTIONAL {
                        # select item adhering to features
                        ?item a ?type .
                        FILTER EXISTS {
                            ?item a ?type .
                            ` +
                    featureTriplePatterns +
                    `
                        }` +
                    (type == "sense"
                        ? `
                        BIND (?item AS ?sense) .`
                        : `
                        ?sense ontolex:isSenseOf ?item .`) +
                    `

                        ` +
                    DataLoader.getTriplePatternsCategorization("sense", "descendantConcept") +
                    `
                        ?descendantConcept skos:broader* ?sub .
                    }
                }
                GROUP BY ?iri ?label
                ORDER BY ?label ?iri`;

                const sparqlResult = await sparqlExecutor.execute(query, [
                    { name: "type", type: "uri", value: typeIRI },
                    { name: "concept", type: "uri", value: conceptIRI }
                ]);
                const data = SparqlResultParser.parseSimpleWithCount(sparqlResult, "value");
                return data;
            }
        }
        return null;
    }

    static getTriplePatternsFeatures(
        features: any,
        type: string,
        varItem: string = "item"
    ): string | null {
        if (!features || (Object.keys(features).length === 0 && features.constructor === Object)) {
            return "";
        }

        try {
            let result = "";
            for (const feature of features) {
                if ("label" in feature) {
                    const labelIri = feature.label;
                    result +=
                        `
                    { ?` +
                        varItem +
                        ` a <` +
                        labelIri +
                        `> . } 
                    UNION
                    { ?` +
                        varItem +
                        ` ^<` +
                        OA +
                        `hasTarget>/<` +
                        OA +
                        `hasBody>/<` +
                        OA +
                        `hasSource> <` +
                        labelIri +
                        `> . }`;
                }
                if ("language" in feature) {
                    const languageTag = feature.language;
                    result +=
                        `
                        ?` +
                        varItem +
                        ` <` +
                        RDFS +
                        `label>|<` +
                        SKOS +
                        `prefLabel> ?` +
                        varItem +
                        `Label .
                        FILTER langMatches(lang(?` +
                        varItem +
                        `Label), "` +
                        languageTag +
                        `") .`;
                }
                if ("pos" in feature) {
                    const posIri = feature.pos;
                    result +=
                        type == "sense"
                            ? `
                        ?` +
                              varItem +
                              ` <` +
                              ONTOLEX +
                              `isSenseOf>/a/<` +
                              RDFS +
                              `subClassOf>* <` +
                              posIri +
                              `> .`
                            : `
                        ?` +
                              varItem +
                              ` a/<` +
                              RDFS +
                              `subClassOf>* <` +
                              posIri +
                              `> .`;
                }
            }
            console.log(result);
            return result;
        } catch (e) {
            return null;
        }
    }

    static getTriplePatternsLexicalization(
        varItem: string = "item",
        varConcept: string = "concept",
        type: string = "sense"
    ): string | null {
        //        return `?`+varItem+` `+ ((type=='entry') ? `^<`+ONTOLEX+`isSenseOf>/` : ``) +
        //            `<`+ONTOLEX+`isLexicalizedSenseOf>|<`+TREE+`isSenseInConcept>|<`+DCTERMS+`subject> ?`+varConcept+` .`;
        return (
            `?` +
            varItem +
            ` ` +
            (type == "entry" ? `^<` + ONTOLEX + `isSenseOf>/` : ``) +
            `<` +
            ONTOLEX +
            `isLexicalizedSenseOf> ?` +
            varConcept +
            ` . #### AGRAPH FIX`
        );
    }

    static getTriplePatternsCategorization(
        varItem: string = "item",
        varConcept: string = "concept",
        type: string = "sense"
    ): string | null {
        //        return `?`+varItem+` `+ ((type=='entry') ? `^<`+ONTOLEX+`isSenseOf>/` : ``) +
        //            `(<`+ONTOLEX+`isLexicalizedSenseOf>|<`+TREE+`isSenseInConcept>|<`+DCTERMS+`subject>)/<`+SKOS+`broader>* ?`+varConcept+` .`;
        return (
            `?` +
            varItem +
            ` ` +
            (type == "entry" ? `^<` + ONTOLEX + `isSenseOf>/` : ``) +
            `<` +
            ONTOLEX +
            `isLexicalizedSenseOf>/<` +
            SKOS +
            `broader>* ?` +
            varConcept +
            ` . #### AGRAPH FIX`
        );
    }
}
