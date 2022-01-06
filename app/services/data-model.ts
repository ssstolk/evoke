// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import { getRecordValue, SparqlRecord } from "app/services/infrastructure/sparql-result-parser";

export interface ITerm {
    iri: string;
    name: string;
}

export interface ITermTree {
    term: ITerm;
    children?: ITermTree[];
}

export interface ITermWeighted {
    term: ITerm;
    weight: number;
}

export class Term {
    /**
     * This functions returns whether one term, 'lhs', is deemed the same as
     * another, 'rhs'. Two terms are considered the same if they are either
     * (1) both undefined or (2) both defined and carry the same iri.
     */
    public static isSame(lhs: ITerm | undefined, rhs: ITerm | undefined): boolean {
        if (!lhs && !rhs) {
            return true;
        }
        if (lhs && rhs && lhs.iri === rhs.iri) {
            return true;
        }
        return false;
    }

    /**
     * This functions returns whether one term, 'lhs', is deemed the same in
     * content as another, 'rhs'. Two terms are considered the same in content
     * if they are either (1) both undefined or (2) both defined and carry
     * the same iri, name, and icon.
     */
    public static isSameInContent(lhs: ITerm | undefined, rhs: ITerm | undefined): boolean {
        if (!this.isSame(lhs, rhs)) {
            return false;
        }
        if (!lhs && !rhs) {
            return true;
        }
        if (lhs && rhs && lhs.iri === rhs.iri && lhs.name === rhs.name) {
            return true;
        }
        return false;
    }

    public static includes(term: ITerm, array: ITerm[]): boolean {
        return Term.findIndex(term, array) >= 0;
    }
    public static findIndex(term: ITerm, array: ITerm[]): number {
        return array.findIndex(element => Term.isSame(term, element));
    }
}

export class TermBuilder {
    /**
     * Function that parses a SPARQL record to retrieve an ITerm.
     * By default, it parses the record using "entry_iri", "entry_text" etc.
     * as the variables to be parsed. It is possible to set the 'using'
     * parameter to "group" instead, however, to parse "group_iri",
     * "group_text" etc. instead.
     */
    public static parseFromSparqlRecord(record: SparqlRecord, iri: string, name: string): ITerm {
        const object: ITerm = {
            iri: getRecordValue(record, iri),
            name: getRecordValue(record, name)
        };
        return object;
    }

    public static create(iri: string, name: string): ITerm {
        const object: ITerm = { iri, name };
        return object;
    }
}

export class TermTreeBuilder {
    public static create(parent: ITerm, children?: ITerm[]): ITermTree {
        const result: ITermTree = { term: parent };
        if (children) {
            const childNodes: ITermTree[] = children.map(term => {
                const tree: ITermTree = { term: term };
                return tree;
            });
            result.children = childNodes;
        }
        return result;
    }
}
