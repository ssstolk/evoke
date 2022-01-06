// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import { DataService } from "./data-catalog";
import { ISparqlJsonResult, SparqlValue } from "app/services/infrastructure/sparql-executor";

type DictionaryLike<V> = { [name: string]: V | undefined };

export type SparqlRecord = DictionaryLike<SparqlValue>;

export const EVOKE_VAR_SOURCE = "evoke-source";

export class SparqlResultParser {
    static parse(
        result: ISparqlJsonResult,
        source?: DataService,
        parseValue?: (value: any) => any
    ): SparqlRecord[] {
        const vars = result.head.vars;
        const bindings = result.results.bindings;
        const records: SparqlRecord[] = [];
        for (const binding of bindings) {
            const record: SparqlRecord = {};
            let hasValue: boolean = false;
            for (const varName of vars) {
                const value = binding[varName];
                if (value) {
                    hasValue = true;
                    record[varName] = parseValue ? parseValue(value) : value;
                } else {
                    record[varName] = undefined;
                }
            }
            if (hasValue) {
                if (source) {
                    record[EVOKE_VAR_SOURCE] = { type: "literal", value: source };
                }
                records.push(record);
            }
        }
        return records;
    }

    static parseSimpleWithCount(result: ISparqlJsonResult, varName: string): any[] | null {
        const parsed = this.parseSimple(result);
        if (parsed.length == 1 && parsed[0][varName] == 0) {
            return null;
        }
        return parsed;
    }

    static parseSimple(result: ISparqlJsonResult, source?: DataService): any[] {
        return this.parse(result, source, SparqlResultParser.parseSimpleValue);
    }

    static parseSimpleValue(sparqlValue: SparqlValue): string | number | undefined {
        if (sparqlValue == undefined || sparqlValue.value == undefined) {
            return undefined;
        }

        const value = sparqlValue.value;
        if (
            sparqlValue.type == "literal" &&
            sparqlValue.datatype &&
            sparqlValue.datatype == "http://www.w3.org/2001/XMLSchema#integer"
        ) {
            return +value;
        }
        return value;
    }
}

export function getRecordNode(record: SparqlRecord, varName = ""): SparqlValue | null {
    const node = record[varName];
    return node ? node : null;
}

export function getRecordValue(record: SparqlRecord, varName = ""): string {
    const node = getRecordNode(record, varName);
    return node ? node.value : "";
}

export function getFirstNode(records: SparqlRecord[], varName?: string): SparqlValue | null {
    return records && records.length > 0 ? getRecordNode(records[0], varName) : null;
}

export function getFirstValue(records: SparqlRecord[], varName?: string): string | null {
    return records && records.length > 0 ? getRecordValue(records[0], varName) : null;
}

export function getValueList(records: SparqlRecord[], varName?: string): string[] | null {
    return records && records.length > 0
        ? records.map(element => {
              return getRecordValue(element, varName);
          })
        : null;
}
