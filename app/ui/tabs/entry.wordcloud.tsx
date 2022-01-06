// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { DataLoader } from "app/services/data-loader/data-loader.service";
import { ITermWeighted, Wordcloud } from "app/ui/components/wordcloud";
import { ITerm } from "app/services/data-model";
import { NavigateService } from "app/services/navigate.service";
import { withLoading } from "app/ui/_generic/loader";

export function getEntryWordcloud(iri: string) {
    return withLoading(EntryWordcloud, "spinner", DataLoader.loadEntryWordcloud, [iri]);
}

export interface IEntryWordcloudProps {
    iri: string;
    data: ITermWeighted[];
}

export class EntryWordcloud extends React.Component<IEntryWordcloudProps> {
    render(): JSX.Element {
        return <Wordcloud data={this.props.data} onClick={this.onClick} />;
    }

    onClick(term: ITerm) {
        NavigateService.browse(term.iri);
    }
}
