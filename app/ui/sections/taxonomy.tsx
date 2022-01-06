// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { Button, Breadcrumb, BreadcrumbItem, Collapse } from "reactstrap";
import { D3Tree } from "app/ui/components/d3tree";
import { DataLoader } from "app/services/data-loader/data-loader.service";
import { ErrorMessage } from "app/ui/_generic/error-message";
import { ITerm, ITermTree, Term, TermBuilder, TermTreeBuilder } from "app/services/data-model";
import { NavigateService } from "app/services/navigate.service";

import "./taxonomy.less";

export interface ITaxonomyState {
    locationData: ITerm[];
    browsing: boolean;
    treeData?: ITermTree;
    error?: Error;
}

export interface ITaxonomyProps {
    iri?: string;
}

export class Taxonomy extends React.Component<ITaxonomyProps, ITaxonomyState> {
    constructor(props: ITaxonomyProps) {
        super(props);
        this.state = {
            locationData: new Array(),
            browsing: props.iri ? false : true
        };

        this.onSelect = this.onSelect.bind(this);
        this.onBrowse = this.onBrowse.bind(this);
        this.onClick = this.onClick.bind(this);
        this.onHold = this.onHold.bind(this);
    }

    async componentDidMount() {
        await this.loadData(this.props);
    }

    async componentWillReceiveProps(nextProps: ITaxonomyProps) {
        if (nextProps.iri && nextProps.iri != this.props.iri) {
            this.setState({ browsing: false });
        }
        await this.loadData(nextProps);
    }

    async loadData(props?: ITaxonomyProps): Promise<void> {
        const iri = props === undefined || props === this.props ? this.props.iri : props.iri;
        const browsing =
            iri == "evoke:concept:all" ||
            (props === undefined || props === this.props ? this.state.browsing : !iri);
        let locationData = this.state.locationData;
        let treeData = this.state.treeData;

        try {
            if (
                iri &&
                (locationData.length <= 0 ||
                    (iri !== this.props.iri && iri != locationData[locationData.length - 1].iri))
            ) {
                // if locationData needs loading: to obtain path for iri
                locationData = await DataLoader.loadCategoryLocation(iri);
            }

            // retrieve parent node
            const parent =
                locationData.length <= 0 ? undefined : locationData[locationData.length - 1];

            // treeData is not already set for that parent node
            if (
                !(
                    (!parent && treeData && treeData.term.iri == "evoke:concept:all") ||
                    (treeData && Term.isSame(treeData.term, parent))
                )
            ) {
                treeData = await this.loadTreeData(parent);
            }
            this.setState({ locationData, browsing, treeData });
        } catch (ex) {
            this.setState({ error: ex });
        }
    }

    render() {
        return (
            <Breadcrumb tag="nav">
                {!this.state.error ? (
                    this.renderTaxonomy()
                ) : (
                    <ErrorMessage error={this.state.error} />
                )}
            </Breadcrumb>
        );
    }

    renderTaxonomy() {
        return (
            <>
                {this.renderLocation()}
                {this.renderTree()}
            </>
        );
    }

    renderLocation() {
        const locationData = this.state.locationData;
        if (locationData.length <= 0) {
            return null;
        }

        const allTerm = TermBuilder.create("evoke:concept:all", "all");
        return (
            <>
                <BreadcrumbItem tag="a" key="all" onClick={() => this.onClick(allTerm)}>
                    <i>all</i>
                </BreadcrumbItem>
                {locationData.map(term => {
                    return (
                        <BreadcrumbItem
                            tag="a"
                            key={term.iri}
                            iri={term.iri}
                            onClick={() => this.onClick(term)}
                        >
                            <div className="icon-term-type" /> {term.name}
                        </BreadcrumbItem>
                    );
                })}
                <Button
                    size="sm"
                    className="ml-auto ui-state-persist"
                    onClick={this.state.browsing ? this.onSelect : this.onBrowse}
                >
                    {this.state.browsing ? "Open" : "Browse"}
                </Button>
            </>
        );
    }

    renderTree() {
        const treeData = this.state.treeData;
        if (!treeData) {
            return null;
        }

        return (
            <div id="browse-categories">
                <Collapse isOpen={this.state.browsing}>
                    <D3Tree data={treeData} onClick={this.onClick} onHold={this.onHold} />
                </Collapse>
            </div>
        );
    }

    onSelect() {
        let locationData = this.state.locationData;
        if (locationData.length > 0) {
            const term: ITerm = locationData[locationData.length - 1];
            locationData = this.getLocationForSelection(term);
            this.setState({ locationData, browsing: false });
            NavigateService.browse(term.iri);
        }
    }

    onBrowse() {
        this.setState({ browsing: true });
    }

    onClick(term: ITerm) {
        const browsing = this.state.browsing;
        const locationLength = this.state.locationData.length;
        const locationData = this.getLocationForSelection(term);

        if (browsing) {
            if (locationData.length == locationLength) {
                // a click on the current node is interpreted as 'go back one level'
                locationData.pop();
            }
            this.setState({ locationData });
            this.loadData(locationData.length == 0 ? { iri: "evoke:concept:all" } : undefined);
        } else {
            this.setState({ locationData });
            NavigateService.browse(term.iri);
        }
    }

    onHold(term: ITerm) {
        const locationData = this.getLocationForSelection(term);
        this.setState({ locationData, browsing: false });
        NavigateService.browse(term.iri);
    }

    getLocationForSelection(term: ITerm) {
        let currentTerm: ITerm | undefined;
        const locationData = this.state.locationData;

        if (term.iri == "evoke:concept:all") {
            locationData.splice(0);
            return locationData;
        }

        if (locationData.length > 0) {
            currentTerm = locationData[locationData.length - 1];
        }

        if (!Term.isSame(term, currentTerm)) {
            if (Term.includes(term, locationData)) {
                const pos = Term.findIndex(term, locationData);
                locationData.splice(pos + 1);
            } else {
                locationData.push(term);
            }
        }
        return locationData;
    }

    async loadTreeData(parent?: ITerm | null): Promise<ITermTree> {
        return parent && parent !== null
            ? this.loadTreeSubCategories(parent)
            : this.loadTreeTopCategories();
    }

    private async loadTreeTopCategories(): Promise<ITermTree> {
        const categories = await DataLoader.loadTopCategories();
        const term = TermBuilder.create("evoke:concept:all", "all");
        return TermTreeBuilder.create(term, categories);
    }

    private async loadTreeSubCategories(term: ITerm): Promise<ITermTree> {
        const categories = await DataLoader.loadSubCategories(term.iri);
        return TermTreeBuilder.create(term, categories);
    }
}
