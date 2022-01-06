// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";

import "./scalebar.less";

export interface ScaleBarProps {
    data: any;
    width: number;
    height: number;
    title: string;
    subtitle?: string;
    correctData?: ((data: any) => any);
    //    onClick?: ((term: ITerm) => void);
    //    onHold?: ((term: ITerm) => void);
}

interface ScaleBarState {
    data: any;
}

export class ScaleBar extends React.Component<ScaleBarProps, ScaleBarState> {
    constructor(props: ScaleBarProps) {
        super(props);

        const data = props.correctData && props.data ? props.correctData(props.data) : props.data;
        this.state = { data };
    }

    render(): JSX.Element {
        const { width, height, title, subtitle } = this.props;
        const data = this.state.data;
        return (
            <div
                style={{
                    margin: "auto",
                    width,
                    textAlign: "center",
                    marginTop: "20px",
                    marginBottom: "40px"
                }}
            >
                <div className="scalebar-title">{title}</div>
                <div className="scalebar-subtitle">{subtitle}</div>
                <svg className="chart" width={width} height={height}>
                    {data.map((element: any, index: number) => {
                        return (
                            <g
                                key={element.name}
                                transform={"translate(" + this.getPosX(index) + ",0)"}
                            >
                                <rect
                                    fill={this.getColour(index)}
                                    stroke="lightgrey"
                                    strokeWidth="1px"
                                    width={this.getWidth(index)}
                                    height={height}
                                />
                            </g>
                        );
                    })}
                    {data.map((element: any, index: number) => {
                        return (
                            <text
                                key={element.name}
                                textAnchor={this.getTextAnchor(index)}
                                fill="white"
                                x={this.getTextPosX(index)}
                                y="20"
                                dy=".35em"
                                fontSize="10px"
                                fontFamily="arial"
                            >
                                {element.value > 0 ? element.value : ""}
                            </text>
                        );
                    })}
                </svg>
                <div>
                    {data.map((element: any, index: number) => {
                        return (
                            <span className="scalebar-legend-item" key={element.name}>
                                <span
                                    style={{
                                        width: "0.5em",
                                        height: "0.5em",
                                        background: this.getColour(index),
                                        display: "inline-block",
                                        marginRight: "0.25em"
                                    }}
                                />
                                <span className="scalebar-legend-label">{element.name} </span>
                                <span className="scalebar-legend-value">{element.value} / </span>
                            </span>
                        );
                    })}
                    <span className="scalebar-legend-item">
                        <span className="scalebar-legend-label">total: </span>
                        <span className="scalebar-legend-value">{this.getTotal()}</span>
                    </span>
                </div>
            </div>
        );
    }

    getTotal(data?: any): number {
        data = data || this.state.data;
        let total = 0;
        for (const element of data) {
            total += element.value;
        }
        return total;
    }

    getColour(index: number): string {
        const colours = ["rgb(233, 129, 37)", "rgb(36, 132, 193)"];
        return index >= colours.length ? "rgb(180, 180, 180)" : colours[index];
    }

    getPosX(index: number): number {
        const data = this.state.data;
        const width = this.props.width;
        const total = this.getTotal();
        const precount = this.getTotal(index == 0 ? [] : data.slice(0, index));
        return precount * width / (total > 0 ? total : 1);
    }

    getWidth(index: number): number {
        const data = this.state.data;
        const width = this.props.width;
        const total = this.getTotal();

        return data[index].value * width / total;
    }

    getTextAnchor(index: number): string {
        const data = this.state.data;
        return index == 0 ? "start" : index >= data.length - 1 ? "end" : "middle";
    }

    getTextPosX(index: number) {
        const data = this.state.data;
        const width = this.props.width;
        return index == 0
            ? 2
            : index >= data.length - 1
                ? width - 2 - 2
                : this.getPosX(index) + this.getWidth(index) / 2;
    }
}
