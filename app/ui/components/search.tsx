// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import {
    Button,
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
    UncontrolledTooltip
} from "reactstrap";
import { getLDResourceItem } from "app/ui/elements/ld-resource-item";
import { NavigateService } from "app/services/navigate.service";
import {
    SearchEngine,
    ChangeListener,
    ChangeEvent,
    ResultData,
    MatchObject
} from "app/services/data-loader/search-engine.service";

import "./search.less";

interface IComponentState {
    searchKey: string;
    searchKeyIsTooShort: boolean;
    searchResults?: ResultData;
    isSearchResultsOpen: boolean;
    isSearchInProgress: boolean;
}

interface IComponentProps {
    quicksearch?: boolean;
}

export class Search extends React.Component<IComponentProps, IComponentState>
    implements ChangeListener {
    private searchTimer: any;

    constructor(props: IComponentProps) {
        super(props);
        this.state = {
            searchKey: "",
            searchKeyIsTooShort: true,
            isSearchResultsOpen: false,
            isSearchInProgress: false
        };
    }

    async componentDidMount() {
        SearchEngine.addChangeListener(this);
    }

    async componentWillUnmount() {
        SearchEngine.removeChangeListener(this);
    }

    onChange(e: ChangeEvent) {
        this.setState({
            isSearchInProgress: false,
            searchResults: e.data
        });
    }

    performSearch = async (limitSearch: boolean = true) => {
        const searchKey = this.state.searchKey;

        if (searchKey.length < 2) {
            this.setState({
                searchKeyIsTooShort: true,
                isSearchResultsOpen: true
            });
            return;
        }

        this.setState({
            searchKeyIsTooShort: false,
            isSearchInProgress: true,
            isSearchResultsOpen: true
        });

        const searchOptions = limitSearch ? { limit: 10 } : {};
        SearchEngine.search(searchKey, searchOptions);
        /*
        this.setState({
            isSearchInProgress: false,
            searchResults,
            searchResultsLimited: searchLimited,
            searchResultsKey: searchKey
        });*/
    };

    performUnlimitedSearch = async () => {
        NavigateService.search(this.state.searchKey, { limit: 0 });
    };

    closeSearch = () => {
        this.setState({ isSearchResultsOpen: false });
    };

    searchBtnClick = async () => {
        const searchKey = this.state.searchKey;
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }

        if (this.isIriPattern(searchKey)) {
            NavigateService.browse(searchKey);
            return;
        }

        await this.performSearch();
    };

    searchInputChange(newValue: string) {
        this.setState({ searchKey: newValue });
        if (this.isIriPattern(newValue)) {
            if (this.searchTimer) {
                clearTimeout(this.searchTimer);
            }
            return;
        }

        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }
        this.searchTimer = setTimeout(async () => {
            await this.performSearch();
        }, 500);
    }

    isIriPattern(text: string): boolean {
        return text.startsWith("http://") || text.startsWith("https://");
    }

    searchInputKeyDown(keyCode: number) {
        // Keyboard button <Enter>
        if (keyCode == 13) {
            this.searchBtnClick();
        }
        // Keyboard button <Arrow down>
        if (keyCode === 40) {
            this.setFocusToSearchResults();
        }
    }

    setFocusToSearchResults() {
        const searchResults = document.querySelector(".search-result-item") as HTMLElement;
        if (searchResults) {
            searchResults.focus();
        }
    }

    addText(text: string) {
        const searchInput = document.getElementById("qsearch") as HTMLInputElement;
        if (!searchInput || !text || text.length == 0) {
            return;
        }

        searchInput.focus();
        const startPos = searchInput.selectionStart ? searchInput.selectionStart : 0;
        const endPos = searchInput.selectionEnd ? searchInput.selectionEnd : startPos;
        const value = searchInput.value;
        searchInput.value = value.substring(0, startPos) + text + value.substring(endPos);
        searchInput.selectionStart = startPos + text.length;
        searchInput.selectionEnd = startPos + text.length;

        this.searchInputChange(searchInput.value);
    }

    render(): JSX.Element {
        return (
            <form
                className="form-inline my-2 my-lg-0 search-component"
                onSubmit={e => {
                    e.preventDefault();
                }}
            >
                <div className="input-group">
                    <input
                        id="qsearch"
                        type="text"
                        className="form-control"
                        placeholder="Search"
                        aria-label="Search"
                        spellCheck={false}
                        value={this.state.searchKey}
                        onChange={e => this.searchInputChange(e.target.value)}
                        onKeyDown={e => this.searchInputKeyDown(e.which)}
                    />
                    <div className="input-group-append">
                        <button
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={this.searchBtnClick}
                        >
                            <span className="oi oi-magnifying-glass" />
                        </button>
                    </div>
                    {this.props.quicksearch && (
                        <Dropdown isOpen={this.state.isSearchResultsOpen} toggle={this.closeSearch}>
                            <DropdownToggle tag="span" className="invisible-dropdown-toggler" />
                            <DropdownMenu id="menu-qsearch" right>
                                {this.renderSearchResult()}
                            </DropdownMenu>
                        </Dropdown>
                    )}
                    &nbsp;
                    <Button size="sm" onClick={() => this.addText("æ")}>
                        æ
                    </Button>
                    &nbsp;
                    <Button size="sm" onClick={() => this.addText("þ")}>
                        þ
                    </Button>
                </div>
            </form>
        );
    }

    getSearchMessage() {
        if (!this.state.searchKey) {
            return "Please enter search term";
        }
        if (this.state.searchKeyIsTooShort) {
            return "Search term is too short";
        }
        if (this.state.isSearchInProgress) {
            return "Searching...";
        }
        if (
            this.state.searchResults &&
            this.state.searchResults.matches &&
            this.state.searchResults.matches.length === 0
        ) {
            return "No results";
        }
        return null;
    }

    renderSearchResult() {
        const msg = this.getSearchMessage();
        if (msg) {
            return (
                <>
                    <DropdownItem header>{msg}</DropdownItem>
                    {msg == "No results" && (
                        <UncontrolledTooltip placement="bottom" target="menu-qsearch">
                            Tip: use ~ for close matches (e.g. feast~)<br />
                            or use ? or * as wildcards (e.g. f?st, f*st)
                        </UncontrolledTooltip>
                    )}
                </>
            );
        }

        const results = this.state.searchResults;
        if (results === undefined) {
            return;
        }
        //console.log(results);

        const matches = results.matches ? results.matches : [];

        return (
            <>
                <DropdownItem header>
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
                </DropdownItem>
                <DropdownItem divider />
                {this.renderGroups(matches)}
            </>
        );
    }

    renderGroups(matches: MatchObject[]) {
        const matchesPerGroup = SearchEngine.getMatchesPer("groupIri", matches);
        return matchesPerGroup.map(([groupIri, groupItems], index) => {
            const GroupItem = groupIri ? getLDResourceItem({ iri: groupIri }) : null;
            return (
                <React.Fragment key={groupIri}>
                    {GroupItem && (
                        <DropdownItem header className="dropdown-header-group">
                            <span
                                className="dropdown-item search-result-group"
                                onClick={this.closeSearch}
                            >
                                <GroupItem />
                            </span>
                        </DropdownItem>
                    )}
                    {this.renderSupers(groupItems)}
                    {/* Do not render divider for the last item */}
                    {index < matchesPerGroup.length - 1 && <DropdownItem divider />}
                </React.Fragment>
            );
        });
    }

    renderSupers(matches: MatchObject[]) {
        const matchesPerGroup = SearchEngine.getMatchesPer("superIri", matches);
        return matchesPerGroup.map(([superIri, superItems], index) => {
            const SuperItem = superIri ? getLDResourceItem({ iri: superIri }) : null;
            return (
                <React.Fragment key={superIri}>
                    {SuperItem && (
                        <DropdownItem
                            tabIndex={0}
                            key={superIri}
                            tag={() => (
                                <span
                                    className="dropdown-item search-result-subheader"
                                    onClick={this.closeSearch}
                                >
                                    <SuperItem />
                                    <span className="search-result-subheader-details">
                                        (dictionary entry)
                                    </span>
                                </span>
                            )}
                        />
                    )}
                    {this.renderEntries(superItems)}
                </React.Fragment>
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
                <DropdownItem
                    tabIndex={0}
                    key={item.iri}
                    tag={() => (
                        <span
                            className="dropdown-item search-result-item"
                            onClick={this.closeSearch}
                        >
                            <EntryItem />
                            {ConceptItem && (
                                <span className="search-result-item-details">
                                    <ConceptItem />
                                </span>
                            )}
                        </span>
                    )}
                />
            );
        });
    }
}
