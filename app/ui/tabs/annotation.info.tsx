// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { Col, Row } from "reactstrap";
import { DataLoader } from "app/services/data-loader/data-loader.service";
import { LDResourceListing } from "app/ui/elements/ld-resource-listing";
import { getAnnotations } from "app/ui/components/annotations";
import { getLDResourceItem } from "app/ui/elements/ld-resource-item";
import { getResourceInfo } from "./resource.info";
import { withLoadingMultiple } from "app/ui/_generic/loader";

import "./annotation.info.less";

export function getAnnotationInfo(iri: string) {
    return withLoadingMultiple(AnnotationInfo, "spinner", [
        { key: "info", promiseFunc: DataLoader.loadResourceInfo, promiseArgs: [iri] },
        { key: "body", promiseFunc: DataLoader.loadAnnotationBody, promiseArgs: [iri] }
    ]);
}

export interface IAnnotationInfoProps {
    iri: string;
    data?: any;
}

export class AnnotationInfo extends React.Component<IAnnotationInfoProps> {
    render(): JSX.Element | null {
        const { iri, data } = this.props;

        const BodyItem = data.body && getLDResourceItem({ iri: data.body });
        const BodyInfo = getResourceInfo(data.body);
        const AnnotationsSection = getAnnotations(iri);

        return (
            <span id="tab-annotation-info">
                <p className="iri">
                    <small>
                        <em>IRI:</em> {iri}
                    </small>
                </p>

                <Row>
                    <Col>
                        <div id="tab-annotation-infoList">
                            <LDResourceListing data={data.info} />
                        </div>
                    </Col>
                    {data.body && (
                        <Col>
                            <div
                                id="tab-annotation-infoBody"
                                className="rounded border border-dark"
                            >
                                <em>has annotation body:</em>
                                &nbsp;
                                <strong>
                                    <BodyItem />
                                </strong>
                                <hr />
                                <BodyInfo iri={data.body} />
                            </div>
                        </Col>
                    )}
                </Row>

                <AnnotationsSection iri={iri} />
            </span>
        );
    }
}
