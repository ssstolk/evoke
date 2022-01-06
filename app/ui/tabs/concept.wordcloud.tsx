// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { DataLoader } from "app/services/data-loader/data-loader.service";
import { ITermWeighted, Wordcloud } from "app/ui/components/wordcloud";
import { ITerm } from "app/services/data-model";
import { NavigateService } from "app/services/navigate.service";
import { withLoading } from "app/ui/_generic/loader";

export function getConceptWordcloud(iri: string) {
    return withLoading(ConceptWordcloud, "spinner", DataLoader.loadConceptWordcloud, [iri]);
}

export interface IConceptWordcloudProps {
    iri: string;
    data: ITermWeighted[];
}

export class ConceptWordcloud extends React.Component<IConceptWordcloudProps> {
    render(): JSX.Element {
        return <Wordcloud data={this.props.data} onClick={this.onClick} />;
    }

    onClick(term: ITerm) {
        NavigateService.browse(term.iri);
    }
}
