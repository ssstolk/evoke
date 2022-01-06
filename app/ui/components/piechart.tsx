// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import "d3pie";
import { ITerm } from "app/services/data-model";

import "./piechart.less";

export interface IPieChartProps {
    id: string;
    data: any;
    title?: string;
    subtitle?: string;
    onClick?: ((iri: ITerm) => void);
}

type PieChartMode = "normal" | "config";

interface IPieChartState {
    mode: PieChartMode;
}

export class PieChart extends React.Component<IPieChartProps, IPieChartState> {
    container: HTMLElement | null;

    static width = 875;
    static height = 400;

    constructor(props: IPieChartProps) {
        super(props);
        this.state = { mode: "normal" };
        this.toggleMode = this.toggleMode.bind(this);
        this.toggleSlice = this.toggleSlice.bind(this);
        this.onConfigLoad = this.onConfigLoad.bind(this);
        this.markDisabledSlices = this.markDisabledSlices.bind(this);
        this.saveSegmentColours = this.saveSegmentColours.bind(this);
        this.clickSegment = this.clickSegment.bind(this);
    }

    componentDidMount() {
        const { data, title, subtitle } = this.props;
        this.pcInit();
        this.pcUpdate(data, title, subtitle);
    }

    componentWillUnmount() {
        this.pcDestroy();
    }

    _setRef(el: HTMLElement) {
        this.container = el;
    }

    render() {
        return <span id={this.props.id} ref={this._setRef.bind(this)} />;
    }

    componentWillReceiveProps(nextProps: IPieChartProps) {
        const { data, title, subtitle } = nextProps;
        this.pcUpdate(data, title, subtitle);
    }

    shouldComponentUpdate() {
        return false;
    }

    pcInit() {
        if (this.props.data) {
            this.props.data.sort(PieChart.sort);
        }
        return;
    }

    pcUpdate(data: any, title?: string, subtitle?: string) {
        if (this.container == null || data == null || data == "") {
            return;
        }

        console.log(data);

        const mode = this.state.mode;
        if (mode != "config") {
            data = data.filter((element: any) => !element.disabled);
        }
        // const firstDraw = (this.container.childElementCount == 0);

        this.container.innerHTML = "<span></span>";
        const chart = new d3pie(this.container, {
            header: {
                title: {
                    text: mode == "config" ? "_____" : title,
                    fontSize: 24,
                    font: "open sans"
                },
                subtitle: {
                    text: mode == "config" ? "hide unwanted slices and click" : subtitle,
                    color: "#999999",
                    fontSize: 12,
                    font: "open sans"
                },
                titleSubtitlePadding: 4
            },
            footer: {
                //                    "location": "bottom-left",
                color: "#999999",
                fontSize: 10,
                font: "open sans"
            },
            size: {
                canvasWidth: PieChart.width,
                canvasHeight: PieChart.height,
                pieInnerRadius: "16%",
                pieOuterRadius: "90%"
            },
            data: {
                sortOrder: "none", //"value-desc",
                content: data
            },
            labels: {
                outer: {
                    //                    "format": "label-value2",
                    pieDistance: 32
                },
                inner: {
                    hideWhenLessThanPercentage: 3
                },
                mainLabel: {
                    color: "#000000"
                },
                percentage: {
                    color: "#ffffff",
                    decimalPlaces: 0
                },
                value: {
                    color: "#adadad",
                    fontSize: 11
                },
                lines: {
                    enabled: true,
                    style: "straight"
                },
                truncation: {
                    enabled: true
                }
            },
            tooltips: {
                enabled: true,
                type: "placeholder",
                string: "{label}: {value} ({percentage}%)",
                styles: {
                    fontSize: 15
                }
            },
            callbacks: {
                onClickSegment: mode == "config" ? this.toggleSlice : this.clickSegment,
                onload: mode == "config" ? this.onConfigLoad : undefined
            },
            effects: {
                load: {
                    speed: mode == "config" ? 0 : 600
                },
                pullOutSegmentOnClick: {
                    effect: mode == "config" ? "none" : "linear",
                    speed: 400,
                    size: 8
                }
            }
        });
        //        console.log(chart);
        if (chart && (chart as any).options.data.content.length > 0) {
            // add mode switching functionality (normal vs config)
            const titleId = (chart as any).cssPrefix + "title";
            const modeElement = this.container.firstChild as HTMLElement;
            if (modeElement != null) {
                if (mode == "config") {
                    modeElement.setAttribute("class", "oi oi-check");
                    modeElement.setAttribute(
                        "style",
                        "float: right; position: relative; top: 3.8em; left: -20.5em;"
                    );
                    modeElement.onclick = this.toggleMode;
                } else {
                    modeElement.setAttribute("class", "oi oi-cog");
                    modeElement.setAttribute(
                        "style",
                        "float: right; position: relative; top: 2.3em; left: -18em;"
                    );
                    modeElement.onclick = this.toggleMode;
                }
            }
        }
    }

    toggleMode() {
        this.saveSegmentColours();

        this.setState({ mode: this.state.mode != "config" ? "config" : "normal" });
        this.forceUpdate();

        const { data, title, subtitle } = this.props;
        this.pcUpdate(data, title, subtitle);
    }

    saveSegmentColours() {
        if (this.container == null) {
            return;
        }
        const children = Array.prototype.slice.call(this.container.getElementsByTagName("path"));
        children.forEach((segment: any) => {
            const index = segment.getAttribute("data-index");
            const color = segment.getAttribute("fill");
            if (index && color) {
                const element = this.props.data[index];
                if (element && !element.color) {
                    element.color = color;
                }
            }
        });
        console.log("saved slice colours");
    }

    clickSegment(segment: any) {
        if (!this.props || !this.props.onClick || !segment || !segment.data) {
            return;
        }
        const iri = segment.data.iri ? segment.data.iri : undefined;
        const label = segment.data.label ? segment.data.iri : undefined;
        const term: ITerm = { iri: iri, name: label };
        this.props.onClick(term);
    }

    onConfigLoad() {
        this.markDisabledSlices();
    }

    markDisabledSlices() {
        if (this.container == null) {
            return;
        }
        const children = Array.prototype.slice.call(this.container.getElementsByTagName("path"));
        children.forEach((segment: any) => {
            const index = segment.getAttribute("data-index");
            if (index) {
                const element = this.props.data[index];
                if (element.disabled) {
                    segment.classList.add("d3pie-segment-disabled");
                }
            }
        });
    }

    toggleSlice(slice: any) {
        const index = slice.segment.getAttribute("data-index");
        if (index) {
            const element = this.props.data[index];
            const wasDisabled = element.disabled;
            const isDisabled = !wasDisabled;
            element.disabled = isDisabled;
            if (isDisabled) {
                slice.segment.classList.add("d3pie-segment-disabled");
            } else {
                slice.segment.classList.remove("d3pie-segment-disabled");
            }
        }
    }

    pcDestroy() {
        return;
    }

    static sort(firstEl: any, secondEl: any) {
        if (firstEl.value > secondEl.value) {
            return -1;
        }
        if (firstEl.value < secondEl.value) {
            return 1;
        }
        if (firstEl.label == secondEl.label) {
            if (firstEl.iri && secondEl.iri) {
                if (firstEl.iri == secondEl.iri) {
                    return 0;
                }
                return firstEl.iri < secondEl.iri ? -1 : 1;
            }
            return 0;
        }
        return firstEl.label < secondEl.label ? -1 : 1;
    }
}
