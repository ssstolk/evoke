// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { Col, Row } from "reactstrap";
import { DataLoader } from "app/services/data-loader/data-loader.service";
import { getAnnotations } from "app/ui/components/annotations";
import { getEntryInfo } from "./entry.info";
import { getLDResourceItem } from "app/ui/elements/ld-resource-item";
import { LDResourceListing } from "app/ui/elements/ld-resource-listing";
import { withLoadingMultiple } from "app/ui/_generic/loader";

import "./sense.info.less";

export function getSenseInfo(iri: string) {
    return withLoadingMultiple(SenseInfo, "spinner", [
        { key: "concepts", promiseFunc: DataLoader.loadSenseLocations, promiseArgs: [iri] },
        { key: "info", promiseFunc: DataLoader.loadSenseInfo, promiseArgs: [iri] },
        { key: "entry", promiseFunc: DataLoader.loadSenseEntry, promiseArgs: [iri] },
        { key: "annotations", promiseFunc: DataLoader.loadResourceAnnotations, promiseArgs: [iri] }
    ]);
}

export interface ISenseInfoProps {
    iri: string;
    data?: any;
}

export class SenseInfo extends React.Component<ISenseInfoProps> {
    render(): JSX.Element | null {
        const { iri, data } = this.props;

        const ConceptItems = !data.concepts
            ? []
            : data.concepts.map((iri: string) => getLDResourceItem({ iri }));
        const EntryItem = getLDResourceItem({ iri: data.entry });
        const EntryInfo = getEntryInfo(data.entry);
        const AnnotationsSection = getAnnotations(iri);

        return (
            <span id="tab-sense-info">
                <div className="tab-bar">
                    <em>in sense evoking:</em>
                    {ConceptItems.map((Item: any, index: number) => (
                        <span key={index}>
                            &nbsp;<Item />
                        </span>
                    ))}
                </div>

                <p className="iri">
                    <small>
                        <em>IRI:</em> {iri}
                    </small>
                </p>

                <Row>
                    <Col>
                        <div id="tab-sense-infoList">
                            <LDResourceListing data={data.info} />
                        </div>
                    </Col>
                    <Col>
                        <div id="tab-sense-infoEntry" className="rounded border border-dark">
                            <em>belongs to entry:</em>
                            &nbsp;
                            <strong>
                                <EntryItem />
                            </strong>
                            <hr />
                            <EntryInfo iri={data.entry} />
                        </div>
                    </Col>
                </Row>

                <AnnotationsSection iri={iri} />
            </span>
        );
    }
}
