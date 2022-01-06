// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import { DataLoader, SearchOptions } from "./data-loader.service";
import { getRecordValue } from "app/services/infrastructure/sparql-result-parser";

interface SearchState {
    search?: SearchData;
    results?: ResultData;
    listeners: Set<ChangeListener>;
}

export interface SearchData {
    key: string;
    options?: SearchOptions;
}

export interface ResultData {
    key: string;
    options?: SearchOptions;
    matches?: MatchObject[];
    limited?: boolean;
    message?: string;
}

export interface MatchObject {
    iri: string;
    groupIri: string;
    superIri?: string;
    conceptIri?: string;
}

export interface ChangeListener {
    onChange(e: ChangeEvent): void;
}

export interface ChangeEvent {
    type: ChangeEventType;
    data: any;
}

export enum ChangeEventType {
    Results,
    Message
}

export class SearchEngine {
    private static state: SearchState = {
        listeners: new Set()
    };

    public static async search(key: string, options?: SearchOptions) {
        this.getOptions(options);

        if (key.length == 0) {
            this.state.search = undefined;
            return;
        }

        this.state.search = { key, options };
        let matches: MatchObject[] = [];
        let message = undefined;
        let limited = false;

        if (
            this.state.results &&
            this.state.results.key === key &&
            this.state.results.options === this.state.search.options
        ) {
            matches =
                this.state.results && this.state.results.matches ? this.state.results.matches : [];
        } else {
            this.state.results = undefined;
            const options = this.state.search && this.state.search.options;
            const result = await DataLoader.loadSearchResults(key, options);
            if (result == null || this.state.search.key !== key) {
                // State might update while we were waiting for ajax call
                return;
            }
            matches = result.map((r: any) => ({
                iri: getRecordValue(r, "entry"),
                groupIri: getRecordValue(r, "group"),
                superIri: getRecordValue(r, "superentry"),
                conceptIri: getRecordValue(r, "concept")
            }));
            const searchLimit = options && options.limit;
            if (searchLimit && searchLimit > 0 && searchLimit < matches.length) {
                limited = true;
                matches = matches.slice(0, searchLimit);
                message = "Showing first " + searchLimit + " results";
            } else {
                message = "Showing search results";
            }
        }

        const results = { key, options, matches, limited, message };
        this.state.results = results;
        this.fireEvent(ChangeEventType.Results, results);
    }

    public static getOptions(options: any) {
        return;
    }

    public static addChangeListener(listener: ChangeListener) {
        this.state.listeners.add(listener);
    }

    public static removeChangeListener(listener: ChangeListener) {
        this.state.listeners.delete(listener);
    }

    public static fireEvent(type: ChangeEventType, data?: any) {
        const e: ChangeEvent = { type, data };
        this.state.listeners.forEach(listener => {
            listener.onChange(e);
        });
    }

    public static getMatchesPer(keyName: string, matches: MatchObject[]) {
        const groups: { [key: string]: MatchObject[] } = {};
        for (const match of matches) {
            const key = match[keyName as keyof MatchObject] || "";
            groups[key] = [...(groups[key] || []), match];
        }
        return Object.entries(groups);
    }
}
