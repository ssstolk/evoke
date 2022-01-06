// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import { Catalog, Dataset, DataService } from "app/services/infrastructure/data-catalog";
import { FileHelper } from "app/utils/file-helper";

export interface AppConfig {
    catalog: Catalog;
    datasetsEnabled: string[];
    localDataServiceEnabled: boolean;
}

export class AppConfigAccess {
    public static getDataset(iri: string, config: AppConfig): Dataset | undefined {
        if (config) {
            for (const dataset of config.catalog.dataset) {
                if (iri == dataset["@id" as keyof Dataset]) {
                    return dataset;
                }
            }
        }
        return undefined;
    }

    public static getDataService(iri: string, config: AppConfig): DataService | undefined {
        if (config) {
            for (const service of config.catalog.service) {
                if (iri == service["@id" as keyof DataService]) {
                    return service;
                }
            }
        }
        return undefined;
    }

    public static getDataServiceForDataset(
        iri: string,
        config: AppConfig
    ): DataService | undefined {
        if (config) {
            const dataset = AppConfigAccess.getDataset(iri, config);
            if (!dataset) {
                return undefined;
            }
            if (dataset.distribution && dataset.distribution.accessService) {
                const serviceIri = dataset.distribution.accessService;
                return AppConfigAccess.getDataService(serviceIri, config);
            }
            for (const service of config.catalog.service) {
                if (service.servesDataset && service.servesDataset.includes(iri)) {
                    return service;
                }
            }
        }
        return undefined;
    }

    public static downloadCatalogue(config: AppConfig) {
        let content;
        try {
            content = JSON.stringify(config.catalog, null, "\t");
        } catch (e) {
            content = "";
        }
        FileHelper.downloadFile("catalogue", content);
    }
}
