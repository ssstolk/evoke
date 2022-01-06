// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import { appHistory } from "app/services/infrastructure/router-history";
import { AppConfigAccess } from "./config/app-config";
import { BrowsePage } from "app/ui/pages/browse.page";
import { IAppConfigProvider } from "app/services/config/app-config-loader.service";
import { resolveInject } from "app/di";
import { SearchPage } from "app/ui/pages/search.page";
import { StatisticsPage } from "app/ui/pages/statistics.page";

export class NavigateService {
    static getCurrentParameters(): URLSearchParams {
        const search = appHistory.location.search;
        return new URLSearchParams(search);
    }

    static getCurrentPathname(): string {
        return appHistory.location.pathname;
    }

    static getActionLinkWithParams(action: string, params?: URLSearchParams): string {
        return action + (params ? "?" + params.toString() : "");
    }

    static retainOnly(params: URLSearchParams | undefined, retainKeys: string[]): URLSearchParams {
        const currentKeys: string[] = [];
        /*      // The snippet below fails to function in Chrome
        params.forEach((value: string, key: string, parent: URLSearchParams) => { 
            currentKeys.push(key);
        });
*/
        if (params === undefined) {
            return new URLSearchParams();
        }

        const regex = /(^|&)([^=]*)=/g;
        const text = params.toString();
        let match = regex.exec(text);
        while (match) {
            currentKeys.push(match[2]);
            match = regex.exec(text);
        }

        for (const key of currentKeys) {
            if (!retainKeys.includes(key)) {
                params.delete(key);
            }
        }
        return params;
    }

    static obtainParamsFromConfig(): URLSearchParams | undefined {
        const config = resolveInject(IAppConfigProvider).config;
        const datasetsEnabled = config.datasetsEnabled;
        const paramsString = datasetsEnabled
            .map((datasetIri: string) => {
                const dataset = AppConfigAccess.getDataset(datasetIri, config);
                return dataset == undefined ? undefined : dataset.identifier;
            })
            .filter((datasetId: string) => {
                return datasetId != null && datasetId != undefined;
            })
            .map((datasetId: string) => {
                return "source=" + datasetId;
            })
            .join("&");

        return paramsString.length == 0 ? undefined : new URLSearchParams(paramsString);
    }

    static setParams(params?: URLSearchParams) {
        const pathname = appHistory.location.pathname;
        const url = NavigateService.getActionLinkWithParams(pathname, params);
        appHistory.push(url);
    }

    /* --- SEARCH --- */

    static getSearchLinkWithParams(params?: URLSearchParams): string {
        return NavigateService.getActionLinkWithParams(SearchPage.PATHNAME, params);
    }

    static getSearchLink(key?: string, options?: any): string {
        const params = NavigateService.getCurrentParameters();
        NavigateService.retainOnly(params, ["source"]);
        if (key) {
            params.set("key", key);
        }
        for (const option in options) {
            params.set(option, options[option]);
        }
        return NavigateService.getSearchLinkWithParams(params);
    }

    static searchWithParams(params?: URLSearchParams) {
        appHistory.push(NavigateService.getSearchLinkWithParams(params));
    }

    static search(key?: string, options?: any) {
        appHistory.push(NavigateService.getSearchLink(key, options));
    }

    /* --- STATISTICS --- */

    static getStatisticsLinkWithParams(params?: URLSearchParams): string {
        if (params === undefined) {
            params = NavigateService.obtainParamsFromConfig();
        }
        params = NavigateService.retainOnly(params, [
            "source",
            "type",
            "features",
            "compare",
            "compareFeatures",
            "location",
            "chart"
        ]);
        return NavigateService.getActionLinkWithParams(StatisticsPage.PATHNAME, params);
    }

    static getStatisticsLink(
        type?: string,
        features?: any,
        compare?: string,
        compareFeatures?: string,
        location?: string,
        chart?: string
    ): string {
        const params = NavigateService.getCurrentParameters();
        NavigateService.retainOnly(params, ["source"]);
        if (type) {
            params.set("type", type);
        }
        if (features) {
            params.set("features", JSON.stringify(features));
        }
        if (compare) {
            params.set("compare", compare);
        }
        if (compareFeatures) {
            params.set("compareFeatures", JSON.stringify(compareFeatures));
        }
        if (location) {
            params.set("location", location);
        }
        if (chart) {
            params.set("chart", chart);
        }
        return NavigateService.getStatisticsLinkWithParams(params);
    }

    static statisticsWithParams(params?: URLSearchParams) {
        appHistory.push(NavigateService.getStatisticsLinkWithParams(params));
    }

    static statistics(
        type?: string,
        features?: any,
        compare?: string,
        compareFeatures?: string,
        location?: string,
        chart?: string
    ) {
        appHistory.push(
            NavigateService.getStatisticsLink(
                type,
                features,
                compare,
                compareFeatures,
                location,
                chart
            )
        );
    }

    /* --- BROWSE / VIEW --- */

    static getBrowseLinkWithParams(params?: URLSearchParams): string {
        if (params === undefined) {
            params = NavigateService.obtainParamsFromConfig();
        }
        params = NavigateService.retainOnly(params, ["source", "iri", "tab"]);
        return NavigateService.getActionLinkWithParams(BrowsePage.PATHNAME, params);
    }

    static getBrowseLink(iri?: string): string {
        const params = NavigateService.getCurrentParameters();
        params.delete("tab");
        params.delete("key");
        params.delete("limit");

        if (!iri || iri == "evoke:concept:all") {
            params.delete("iri");
        } else {
            params.set("iri", iri);
        }

        return NavigateService.getBrowseLinkWithParams(params);
    }

    static browseWithParams(params?: URLSearchParams) {
        appHistory.push(NavigateService.getBrowseLinkWithParams(params));
    }

    static browse(iri?: string): void {
        appHistory.push(NavigateService.getBrowseLink(iri));
    }
}
