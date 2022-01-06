// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { DataLoader } from "app/services/data-loader/data-loader.service";
import { ITerm } from "app/services/data-model";
import { NavigateService } from "app/services/navigate.service";
import { PieChart } from "app/ui/components/piechart";
import { ScaleBar } from "app/ui/components/scalebar";
import { withLoadingMultiple } from "app/ui/_generic/loader";

export function getConceptStatistics(iri: string) {
    return withLoadingMultiple(ConceptStatistics, "spinner", [
        {
            key: "lex",
            promiseFunc: DataLoader.loadConceptStatisticsLexicalizing,
            promiseArgs: [iri]
        },
        { key: "evk", promiseFunc: DataLoader.loadConceptStatisticsEvoking, promiseArgs: [iri] },
        { key: "pos", promiseFunc: DataLoader.loadConceptStatisticsPerPos, promiseArgs: [iri] },
        { key: "sub", promiseFunc: DataLoader.loadConceptStatisticsPerSub, promiseArgs: [iri] }
    ]);
}

export interface IConceptStatisticsProps {
    iri?: string;
    data?: any; //ITermWeighted[];
}

export class ConceptStatistics extends React.Component<IConceptStatisticsProps> {
    static BarChartWidth = 250;
    static BarChartHeight = 40;

    render(): JSX.Element {
        return (
            <>
                <ScaleBar
                    title="Senses in this concept"
                    subtitle="senses here and ones in subordinate concepts"
                    width={ConceptStatistics.BarChartWidth}
                    height={ConceptStatistics.BarChartHeight}
                    data={[
                        { name: "here", value: this.props.data.lex },
                        { name: "subordinate", value: this.props.data.evk - this.props.data.lex }
                    ]}
                />

                <div style={{ margin: "auto", width: "875px" }}>
                    <PieChart
                        id="statistics-pos"
                        data={this.props.data.pos}
                        title="Part of speech"
                        subtitle="distribution of senses that evoke this concept"
                        onClick={this.onClick}
                    />
                    <PieChart
                        id="statistics-subconcepts"
                        data={this.props.data.sub}
                        title="Subordinate concepts"
                        subtitle="distribution of senses that evoke this concept"
                        onClick={this.onClick}
                    />
                </div>
            </>
        );
    }

    onClick(term: ITerm) {
        NavigateService.browse(term.iri);
    }
}
