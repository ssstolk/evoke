// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";

import { LDResourceListing } from "app/ui/elements/ld-resource-listing";
import { getAnnotations } from "../components/annotations";
import { DataLoader } from "app/services/data-loader/data-loader.service";
import { withLoading } from "app/ui/_generic/loader";

import "./resource.info.less";

export function getResourceInfo(iri: string) {
    return withLoading(ResourceInfo, "spinner", DataLoader.loadResourceInfo, [iri]);
}

export interface IResourceInfoProps {
    iri: string;
    data?: any;
}

export class ResourceInfo extends React.Component<IResourceInfoProps> {
    render(): JSX.Element | null {
        const { iri, data } = this.props;
        const AnnotationsSection = getAnnotations(iri);

        return (
            <span id="tab-resource-info">
                <p className="iri">
                    <small>
                        <em>IRI:</em> {iri}
                    </small>
                </p>
                <LDResourceListing data={data} />
                <AnnotationsSection iri={iri} />
            </span>
        );
    }
}
