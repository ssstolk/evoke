// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { DataLoader } from "app/services/data-loader/data-loader.service";
import { LDResourceCategorizations } from "app/ui/elements/ld-resource-categorizations";
import { withLoading } from "app/ui/_generic/loader";

export function getEntryList(iri: string) {
    return withLoading(EntryList, "spinner", DataLoader.loadEntryList, [iri]);
}

export interface IEntryListProps {
    iri: string;
    data?: any;
}

export class EntryList extends React.Component<IEntryListProps> {
    render(): JSX.Element | null {
        const { iri, data } = this.props;

        return (
            <span id="tab-entry-list">
                <p>The various senses of the current entry.</p>
                <LDResourceCategorizations data={data} />
            </span>
        );
    }
}
