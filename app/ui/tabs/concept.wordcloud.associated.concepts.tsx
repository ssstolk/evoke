// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { DataLoader } from "app/services/data-loader/data-loader.service";
import { ITermWeighted, Wordcloud } from "app/ui/components/wordcloud";
import { ITerm } from "app/services/data-model";
import { NavigateService } from "app/services/navigate.service";
import { withLoading } from "app/ui/_generic/loader";

export function getConceptWordcloudAssociatedConcepts(iri: string) {
    return withLoading(
        ConceptWordcloudAssociatedConcepts,
        "spinner",
        DataLoader.loadConceptWordcloudAssociatedConcepts,
        [iri]
    );
}

export interface IConceptWordcloudProps {
    iri: string;
    data: ITermWeighted[];
}

export class ConceptWordcloudAssociatedConcepts extends React.Component<IConceptWordcloudProps> {
    render(): JSX.Element {
        return (
            <>
                <p style={{ marginBottom: "1em" }}>
                    <small>
                        The wordcloud below displays associated concepts. These concepts are evoked
                        by further senses of those words that are found in this semantic field.
                    </small>
                </p>
                <Wordcloud data={this.props.data} onClick={this.onClick} />
            </>
        );
    }

    onClick(term: ITerm) {
        NavigateService.browse(term.iri);
    }
}
