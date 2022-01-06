// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { Button } from "reactstrap";
import { DataLoader } from "app/services/data-loader/data-loader.service";
import { LDResourceListing } from "app/ui/elements/ld-resource-listing";
import { withLoadingMultiple } from "app/ui/_generic/loader";

import "./concept.list.less";

export function getConceptList(iri: string) {
    return withLoadingMultiple(ConceptList, "spinner", [
        { key: "listDirect", promiseFunc: DataLoader.loadConceptListDirect, promiseArgs: [iri] },
        {
            key: "countEvoking",
            promiseFunc: DataLoader.loadConceptStatisticsEvoking,
            promiseArgs: [iri]
        }
    ]);
}

function getConceptListClosestIndirect(iri: string, data?: any) {
    return withLoadingMultiple(
        ConceptListClosestIndirect,
        "spinner",
        [
            {
                key: "listClosestIndirect",
                promiseFunc: DataLoader.loadConceptListClosestIndirect,
                promiseArgs: [iri]
            }
        ],
        data
    );
}

export interface IResourceListProps {
    iri: string;
    data?: any;
}

interface IResourceListState {
    expanded: boolean;
    ConceptListClosestIndirect?: any;
}

export class ConceptList extends React.Component<IResourceListProps, IResourceListState> {
    constructor(props: IResourceListProps) {
        super(props);
        this.state = { expanded: false };
    }

    render(): JSX.Element | null {
        const { iri, data } = this.props;
        const { expanded, ConceptListClosestIndirect } = this.state;
        const countTotal = data.countEvoking || 0;
        const countDirectListed = data.listDirect ? data.listDirect.length : 0;
        const canExpand: boolean = !expanded && countTotal - countDirectListed > 0;

        return (
            <>
                <LDResourceListing data={data.listDirect} />
                {Boolean(canExpand) && (
                    <Button
                        size="sm"
                        outline
                        onClick={() =>
                            this.setState({
                                expanded: true,
                                ConceptListClosestIndirect: getConceptListClosestIndirect(iri, data)
                            })
                        }
                    >
                        Show more from this domain
                    </Button>
                )}
                {expanded && ConceptListClosestIndirect && <ConceptListClosestIndirect iri={iri} />}
            </>
        );
    }
}

class ConceptListClosestIndirect extends React.Component<IResourceListProps> {
    render(): JSX.Element | null {
        const { data } = this.props;
        const countTotal = data.countEvoking || 0;
        const countDirectListed = data.listDirect ? data.listDirect.length : 0;
        const countIndirectListed = data.listClosestIndirect ? data.listClosestIndirect.length : 0;
        const countListed = countDirectListed + countIndirectListed;
        const countUnlisted = countTotal - countListed;

        return (
            <>
                {countIndirectListed > 0 && (
                    <>
                        <h5 style={{ marginTop: "50px" }}>:: Quick view on subordinate concepts</h5>
                        <LDResourceListing data={data.listClosestIndirect} />
                    </>
                )}
                {countUnlisted > 0 && (
                    <p style={{ margin: "auto", textAlign: "right" }}>
                        <small>
                            ... next to any items listed above, there are {countUnlisted} more items
                            found in further subordinate concepts.
                        </small>
                    </p>
                )}
            </>
        );
    }
}
