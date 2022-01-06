// SPDX-License-Identifier: GPL-3.0-or-later

/*
 * Based on code by d3noob, which carries the MIT License:
 * https://gist.github.com/d3noob/43a860bc0024792f8803bba8ca0d5ecd
 * 
 * Changes are copyright 2018-2022 Sander Stolk, optimizing code for use in Evoke:
 *   - making it suitable for the React framework, 
 *   - enabling only two levels at a time, 
 *   - allowing both click and hold events on nodes (jquery-longpress), 
 *   - adjusting colour scheme.
 */

import * as React from "react";
import * as d3 from "d3";
import * as $ from "jquery";
import "jquery.longpress";
import { ITerm, ITermTree, Term, TermBuilder } from "app/services/data-model";

import "./d3tree.less";

export interface ID3TreeProps {
    data: ITermTree;
    onClick?: ((term: ITerm) => void);
    onHold?: ((term: ITerm) => void);
}

export class D3Tree extends React.Component<ID3TreeProps> {
    container: HTMLElement | null;
    svg: any;
    svgGraph: any;
    treemap: any;
    root: any;
    i: number;

    static canvasWidth = 960;
    static canvasHeight = 600;
    static margin = { top: 20, right: 120, bottom: 20, left: 300 };
    static width = D3Tree.canvasWidth - D3Tree.margin.left - D3Tree.margin.right;
    static height = D3Tree.canvasHeight - D3Tree.margin.top - D3Tree.margin.bottom;

    static duration = 750;

    constructor(props: ID3TreeProps) {
        super(props);
        this.d3internal_getId = this.d3internal_getId.bind(this);
    }

    componentDidMount() {
        this.d3Init();
        this.d3Update(this.props.data);
    }

    componentWillUnmount() {
        this.d3Destroy();
    }

    _setRef(el: HTMLElement) {
        this.container = el;
    }

    render() {
        return <div ref={this._setRef.bind(this)} />;
    }

    componentWillReceiveProps(nextProps: ID3TreeProps) {
        if (Term.isSameInContent(nextProps.data.term, this.props.data.term)) {
            return;
        }
        this.d3Update(nextProps.data);
    }

    shouldComponentUpdate() {
        return false;
    }

    d3Init() {
        // append the svg object to the body of the page
        // appends a 'group' element to 'svg'
        // moves the 'group' element to the top left margin
        this.svg = d3
            .select(this.container)
            .append("svg")
            .attr("width", D3Tree.canvasWidth)
            .attr("height", D3Tree.canvasHeight);

        this.svgGraph = this.svg
            .append("g")
            .attr("transform", "translate(" + D3Tree.margin.left + "," + D3Tree.margin.top + ")");

        this.i = 0;

        // declares a tree layout and assigns the size
        this.treemap = d3.tree().size([D3Tree.height, D3Tree.width]);
    }

    addSvgText(
        textId: string,
        text: string,
        parentElement: any,
        className: string,
        x: number,
        y: number
    ) {
        // remove element with textId first, if it already exists
        const textIdElement = document.getElementById(textId);
        if (textIdElement) {
            textIdElement.remove();
        }

        // create element with textId
        const newTextElement = parentElement
            .append("text")
            .attr("id", textId)
            .attr("x", x)
            .attr("y", y)
            .attr("text-anchor", "left")
            .attr("class", className);
        text.split("\n").forEach((line: string, index: number) => {
            newTextElement
                .append("tspan")
                .attr("x", x)
                .attr("dy", index == 0 ? 0 : "1.2em")
                .text(line);
        });
        return newTextElement;
    }

    removeSvgText(textId: string) {
        const element = document.getElementById(textId);
        if (element) {
            element.remove();
        }
    }

    d3Update(treeData: ITermTree) {
        this.root = d3.hierarchy(treeData, function(d: any) {
            return d.children;
        });
        this.root.x0 = D3Tree.height / 2;
        this.root.y0 = 0;
        this.d3internal_update(this.root);

        // open
        this.removeSvgText("d3treeOpenParent");
        if (this.props.onHold && treeData.term.iri !== "evoke:concept:all") {
            const openFunction = this.props.onHold;
            this.addSvgText(
                "d3treeOpenParent",
                "open",
                this.svg,
                "d3treeOpen d3treeOpenParent",
                D3Tree.canvasWidth / 2 -
                    180 +
                    (treeData.children && treeData.children.length > 0 ? -10 : 10),
                D3Tree.canvasHeight / 2 + 20
            )
                .attr(
                    "text-anchor",
                    treeData.children && treeData.children.length > 0 ? "end" : "start"
                )
                .on("click", () => {
                    openFunction(treeData.term);
                });
        }

        // text tip
        if (treeData.children && treeData.children.length > 0) {
            this.addSvgText(
                "d3treeTip",
                "click on a concept to browse;\n" + "press longer to open it and view its contents",
                this.svg,
                "d3treeTip",
                0,
                D3Tree.canvasHeight - D3Tree.margin.bottom
            );
        } else {
            this.addSvgText(
                "d3treeTip",
                "you have reached a leaf\n" +
                    "click it to browse back or click 'open' to view its contents",
                this.svg,
                "d3treeTip",
                D3Tree.canvasWidth / 2,
                D3Tree.canvasHeight / 2 + 40
            );
        }
    }

    d3Destroy() {
        return;
    }

    d3internal_update(source: any) {
        // ensure D3 was initialized properly
        if (this.svgGraph == null) {
            return;
        }

        // Assigns the x and y position for the nodes
        const treeMap = this.treemap(this.root);

        // Compute the new tree layout.
        const nodes = treeMap.descendants();
        const links = treeMap.descendants().slice(1);

        // Normalize for fixed-depth.
        nodes.forEach(function(d: any) {
            d.y = d.depth * 180;
        });

        // ****************** Nodes section ***************************

        // Update the nodes...
        const node = this.svgGraph.selectAll("g.node").data(nodes, this.d3internal_getId);

        // Enter any new modes at the parent's previous position.
        const nodeEnter = node
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", function(d: any) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .attr("iri", function(d: any) {
                return d.data.term.iri;
            });

        $("g.node").longpress(
            (d: any) => {
                // Hold
                if (this.props.onHold) {
                    const term = this.getTermFromTarget(d.currentTarget);
                    if (term) {
                        this.props.onHold(term);
                    }
                }
            },
            (d: any) => {
                // Click
                if (
                    d.target.getAttribute("class") &&
                    d.target.getAttribute("class").indexOf("d3treeOpen") != -1
                ) {
                    if (this.props.onHold) {
                        const term = this.getTermFromTarget(d.currentTarget);
                        if (term) {
                            this.props.onHold(term);
                        }
                    }
                }
                if (this.props.onClick) {
                    const term = this.getTermFromTarget(d.currentTarget);
                    if (term) {
                        this.props.onClick(term);
                    }
                }
            }
        );

        // Add Circle for the nodes
        nodeEnter
            .append("circle")
            .attr("class", "node")
            .attr("r", 1e-6)
            .style("fill", function(d: any) {
                return d._children ? "lightsteelblue" : "yellow";
            });

        // Add labels for the nodes
        const textNode = nodeEnter
            .append("text")
            .attr("dy", ".35em")
            .attr("x", function(d: any) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("xml:space", "preserve") // -- SST: added
            .style("fill-opacity", 1e-6) // -- SST: added
            .attr("text-anchor", function(d: any) {
                return d.children || d._children ? "end" : "start";
            });
        textNode.append("tspan").text(function(d: any) {
            return d.data.term.name;
        });
        textNode
            .append("tspan")
            .attr("class", "spacing")
            .text(function(d: any) {
                return d.depth == 0 ? "" : "     ";
            });
        textNode
            .append("tspan")
            .attr("class", "d3treeOpen d3treeOpenChild")
            .attr("fill", "white")
            //            .attr("visibility", "hidden")
            .text(function(d: any) {
                return d.depth == 0 ? "" : "open";
            });

        // UPDATE
        // Transition to the proper position for the node
        const nodeUpdate = nodeEnter
            .merge(node)
            .transition() // -- SST: changed to ensure nodeUpdate var holds the transitioning node
            .duration(D3Tree.duration)
            .attr("transform", function(d: any) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        // Update the node attributes and style
        nodeUpdate
            .select("circle.node")
            .attr("r", 6)
            .style("fill", function(d: any) {
                return d._children ? "lightsteelblue" : "yellow";
            })
            .attr("cursor", "pointer");

        nodeUpdate
            .select("text") // -- SST: added
            .style("fill-opacity", 1); // -- SST: added

        // Remove any exiting nodes
        const nodeExit = node.exit().remove();

        // On exit reduce the node circles size to 0
        nodeExit.select("circle").attr("r", 1e-6);

        // On exit reduce the opacity of text labels
        nodeExit.select("text").style("fill-opacity", 1e-6);

        // ****************** links section ***************************

        // Update the links...
        const link = this.svgGraph.selectAll("path.link").data(links, function(d: any) {
            return d.id;
        });

        // Enter any new links at the parent's previous position.
        const linkEnter = link
            .enter()
            .insert("path", "g")
            .attr("class", "link")
            .attr("d", function(d: any) {
                const o = { x: source.x0, y: source.y0 };
                return diagonal(o, o);
            });

        // UPDATE
        const linkUpdate = linkEnter.merge(link);

        // Transition back to the parent element position
        linkUpdate
            .transition()
            .duration(D3Tree.duration)
            .attr("d", function(d: any) {
                return diagonal(d, d.parent);
            });

        // Remove any exiting links
        const linkExit = link.exit().remove();

        // Store the old positions for transition.
        nodes.forEach(function(d: any) {
            d.x0 = d.x;
            d.y0 = d.y;
        });

        // Creates a curved (diagonal) path from parent to the child nodes
        function diagonal(s: any, d: any) {
            const path = `M ${s.y} ${s.x}
                C ${(s.y + d.y) / 2} ${s.x},
                ${(s.y + d.y) / 2} ${d.x},
                ${d.y} ${d.x}`;
            return path;
        }
    }

    d3internal_getId(d: any): number {
        return d.id || (d.id = ++this.i);
    }

    getTermFromTarget(element: any): ITerm | null {
        while (element && element.nodeName !== "g") {
            element = element.parentElement;
        }
        return this.getTermFromElement(element);
    }

    getTermFromElement(element: any): ITerm | null {
        if (!element) {
            return null;
        }

        const iri: string = element.attributes.iri.value;
        const name: string = element.lastElementChild.firstElementChild.innerHTML;
        return TermBuilder.create(iri, name);
    }
}
