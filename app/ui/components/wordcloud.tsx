// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import * as WC from "wordcloud";
import { ITerm } from "app/services/data-model";

export interface ITermWeighted {
    term: ITerm;
    weight: number;
}

export interface IWordcloudProps {
    data: ITermWeighted[];
    onClick?: ((term: ITerm) => void);
}

export class Wordcloud extends React.Component<IWordcloudProps> {
    container: HTMLElement | null;

    static width = 800;
    static height = 600;

    constructor(props: IWordcloudProps) {
        super(props);
        this.wcinternal_onClick = this.wcinternal_onClick.bind(this);
    }

    componentDidMount() {
        this.wcInit();
        this.wcUpdate(this.props.data);
    }

    componentWillUnmount() {
        this.wcDestroy();
    }

    _setRef(el: HTMLElement) {
        this.container = el;
    }

    render() {
        return (
            <canvas ref={this._setRef.bind(this)} width={Wordcloud.width} height={Wordcloud.height}>
                Browser does not support HTML canvas.
            </canvas>
        );
    }

    componentWillReceiveProps(nextProps: IWordcloudProps) {
        this.wcUpdate(nextProps.data);
    }

    shouldComponentUpdate() {
        return false;
    }

    wcInit() {
        return; // nothing to initialize
    }

    wcUpdate(data: ITermWeighted[]) {
        if (this.container == null) {
            return;
        }
        WC(this.container, { list: this.wcinternal_getList(data), click: this.wcinternal_onClick });
    }

    wcDestroy() {
        return;
    }

    wcinternal_getList(data: ITermWeighted[]): any {
        if (data.length == 0) {
            return new Array();
        }

        const maxWeight = data[0].weight;
        const minWeight = data[data.length - 1].weight;

        return data.map(entry => [
            entry.term.name,
            this.wcinternal_normalizeWeight(entry.weight, minWeight, maxWeight),
            entry.term
        ]);
    }

    wcinternal_normalizeWeight(weight: number, minWeight: number, maxWeight: number): number {
        // Good values appear to be: 50 (max), 30, 20, 15 (min).
        const lowerBound = 15;
        const upperBound = 50;
        const boundRange = upperBound - lowerBound;

        const weightRange = maxWeight - minWeight;
        const positionInRange = weight - minWeight;

        if (weightRange == 0) {
            return upperBound;
        }

        const value = lowerBound + boundRange * positionInRange / weightRange;
        if (value < lowerBound) {
            return lowerBound;
        }
        if (value > upperBound) {
            return upperBound;
        }
        return value;
    }

    wcinternal_onClick(item: WC.ListEntry, dimension: WC.Dimension, event: MouseEvent) {
        if (!this.props.onClick) {
            return;
        }
        const term = this.getTermFromEntry(item);
        if (term) {
            this.props.onClick(term);
        }
    }

    getTermFromEntry(item: any): ITerm | null {
        if (item.length < 3) {
            return null;
        }
        return item[2];
    }
}
