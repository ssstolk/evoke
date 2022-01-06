// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { getLDResourceItem } from "app/ui/elements/ld-resource-item";
import {
    MatchObject,
    ResultData,
    SearchEngine
} from "app/services/data-loader/search-engine.service";

import "./search-results.less";

interface IComponentProps {
    results?: ResultData;
}

export class SearchResults extends React.Component<IComponentProps> {
    constructor(props: IComponentProps) {
        super(props);
        this.state = {};
        this.performUnlimitedSearch = this.performUnlimitedSearch.bind(this);
    }

    performUnlimitedSearch() {
        const results = this.props.results;
        const options = (results && results.options) || {};
        options.limit = 0;
        if (results) {
            SearchEngine.search(results.key, options);
        }
    }

    dragEntry(event: any) {
        if (event && event.target && event.dataTransfer) {
            // get link base
            const url = window.location.href;
            const linkBase = url.replace(/#.*/g, "");

            // get html and add linkBase to non-absolute hrefs
            let html = event.target.outerHTML;
            html = html.replace(/(href=["'])(?!http)([\/]?)/g, "$1" + linkBase);

            // set data
            event.dataTransfer.setData("text/html", html);
            event.dataTransfer.setData("text/uri-list", event.target.getAttribute("itemid"));
        }
    }

    render(): JSX.Element | null {
        const results = this.props.results;
        if (!results) {
            return null;
        }

        //console.log(results);

        const matches = results.matches ? results.matches : [];

        return (
            <section className="rounded border border-dark">
                <h3 className="mr-auto">Search results for {results.key}</h3>

                <div>
                    {results.message}
                    {!results.limited ? (
                        ""
                    ) : (
                        <>
                            &nbsp;<small
                                className="hoverPointer"
                                onClick={this.performUnlimitedSearch}
                            >
                                [show all]
                            </small>
                        </>
                    )}
                </div>

                {this.renderGroups(matches)}
            </section>
        );
    }

    renderGroups(matches: MatchObject[]) {
        const matchesPerGroup = SearchEngine.getMatchesPer("groupIri", matches);
        return matchesPerGroup.map(([groupIri, groupItems], index) => {
            const GroupItem = groupIri ? getLDResourceItem({ iri: groupIri }) : null;
            return (
                <div className="search-results-group" key={groupIri}>
                    {GroupItem && (
                        <div itemID={groupIri} className="search-results-header rounded">
                            <GroupItem />
                        </div>
                    )}
                    {this.renderSupers(groupItems)}
                </div>
            );
        });
    }

    renderSupers(matches: MatchObject[]) {
        const matchesPerGroup = SearchEngine.getMatchesPer("superIri", matches);
        return matchesPerGroup.map(([superIri, superItems], index) => {
            const SuperItem = superIri ? getLDResourceItem({ iri: superIri }) : null;
            return (
                <div key={superIri} className="search-results-super">
                    {SuperItem && (
                        <div
                            itemID={superIri}
                            className="search-results-subheader"
                            draggable
                            onDragStart={this.dragEntry}
                        >
                            <SuperItem />
                            &nbsp;
                            <span className="search-results-subheader-details">
                                (dictionary entry)
                            </span>
                        </div>
                    )}
                    {this.renderEntries(superItems)}
                </div>
            );
        });
    }

    renderEntries(matches: MatchObject[]) {
        return matches.map(item => {
            const EntryItem = getLDResourceItem({ iri: item.iri });
            const ConceptItem = item.conceptIri
                ? getLDResourceItem({ iri: item.conceptIri })
                : null;
            return (
                <div
                    key={item.iri}
                    itemID={item.iri}
                    itemType={item.groupIri}
                    className="search-results-entry"
                    draggable
                    onDragStart={this.dragEntry}
                >
                    <EntryItem />
                    {ConceptItem && (
                        <>
                            &nbsp;
                            <span className="search-results-entry-details">
                                <ConceptItem />
                            </span>
                        </>
                    )}
                </div>
            );
        });
    }
}
