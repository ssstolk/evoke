// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { DataLoader } from "app/services/data-loader/data-loader.service";
import { DataRequest, withLoadingMultiple } from "app/ui/_generic/loader";
import { EvokeResourceType, getLDResourceItem } from "./ld-resource-item";

export function getLDResourceLabellist(props: ILDResourceLabellistProps) {
    const { iri, resourceType } = props;
    const data = {};
    let requests: DataRequest[] = [
        { key: "labels", promiseFunc: DataLoader.loadResourceLabels, promiseArgs: [iri] }
    ];
    if (resourceType == "sense") {
        requests = requests.concat([
            { key: "entry", promiseFunc: DataLoader.loadSenseEntry, promiseArgs: [iri] },
            {
                key: "entryLabels",
                promiseFunc: LDResourceLabellist.loadEntryLabels,
                promiseArgs: [data]
            }
        ]);
    }
    return withLoadingMultiple(LDResourceLabellist, "ellipsis", requests, data);
}

export interface ILDResourceLabellistProps {
    iri: string;
    resourceType?: EvokeResourceType;
}

export interface ILDResourceLabellistState {
    data: any;
}

export class LDResourceLabellist extends React.Component<
    ILDResourceLabellistProps,
    ILDResourceLabellistState
> {
    constructor(props: any) {
        super(props);
        this.state = { data: props.data };
    }

    static loadEntryLabels(data: any): Promise<any> | null {
        if (data.entryLabels === undefined && data.entry) {
            return DataLoader.loadResourceLabels(data.entry);
        }
        return null;
    }

    render(): JSX.Element | null {
        const { data } = this.state;
        return (
            <>
                {data && data.labels && this.renderLabels(data.labels)}
                {data &&
                    data.entryLabels &&
                    this.renderLabels(data.entryLabels, { opacity: "50%" })}
            </>
        );
    }

    renderLabels(labelRecords: any[], style?: any) {
        const itemStyle = style || {};
        if (itemStyle.marginLeft === undefined) {
            itemStyle.marginLeft = "0.3em";
        }
        return labelRecords.map((record: any) => {
            const iri = record.entry;
            const LabelItem = getLDResourceItem({ iri: record.entry, resourceType: "label" });
            return <LabelItem key={iri} outline style={itemStyle} />;
        });
    }
}
