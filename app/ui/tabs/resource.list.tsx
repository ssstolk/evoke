// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { LDResourceListing } from "app/ui/elements/ld-resource-listing";

import "./resource.list.less";

export interface IResourceListProps {
    iri: string;
    data?: any;
}

export class ResourceList extends React.Component<IResourceListProps> {
    render(): JSX.Element | null {
        const { iri, data } = this.props;

        return (
            <div id="tab-resource-list">
                <LDResourceListing data={data} />
            </div>
        );
    }
}
