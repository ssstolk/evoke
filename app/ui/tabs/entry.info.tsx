// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import { DataLoader } from "app/services/data-loader/data-loader.service";
import { ResourceInfo } from "./resource.info";
import { withLoading } from "app/ui/_generic/loader";

export function getEntryInfo(iri: string) {
    return withLoading(ResourceInfo, "spinner", DataLoader.loadEntryInfo, [iri]);
}
