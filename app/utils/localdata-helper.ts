// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import {
    ISparqlExecutor,
    LocalSparqlExecutor,
    LOCAL_STORAGE_DATASET
} from "app/services/infrastructure/sparql-executor";
import { FileHelper } from "./file-helper";
import { resolveInjectArray } from "app/di";

export class LocalData {
    public static repopulate() {
        resolveInjectArray(ISparqlExecutor)
            .filter(executor => {
                return executor instanceof LocalSparqlExecutor;
            })
            .forEach(executor => {
                (executor as LocalSparqlExecutor).populate();
            });
    }

    public static repopulateWith(data?: string) {
        if (!data) {
            localStorage.removeItem(LOCAL_STORAGE_DATASET);
        } else {
            localStorage.setItem(LOCAL_STORAGE_DATASET, data);
        }
        LocalData.repopulate();
    }

    public static download() {
        const localLD = localStorage.getItem(LOCAL_STORAGE_DATASET);
        let content;
        try {
            content = JSON.stringify(JSON.parse(localLD || ""), null, "\t");
        } catch (e) {
            content = localLD || "";
        }
        FileHelper.downloadFile("evoke-localdata", content);
    }
}
