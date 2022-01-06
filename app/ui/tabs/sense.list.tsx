// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { DataLoader } from "app/services/data-loader/data-loader.service";
import { LDResourceCategorizations } from "app/ui/elements/ld-resource-categorizations";
import { withLoading } from "app/ui/_generic/loader";

export function getSenseList(iri: string) {
    return withLoading(SenseList, "spinner", DataLoader.loadSenseList, [iri]);
}

export interface ISenseListProps {
    iri: string;
    data?: any;
}

export class SenseList extends React.Component<ISenseListProps> {
    render(): JSX.Element | null {
        const { iri, data } = this.props;

        return (
            <span id="tab-sense-list">
                <p>
                    The various senses of the current word form. The sense currently open is listed
                    first.
                </p>
                <LDResourceCategorizations data={data} />
            </span>
        );
    }
}
