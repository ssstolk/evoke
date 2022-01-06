// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { Button, Col, Container, Row, UncontrolledTooltip } from "reactstrap";
import { getQueryParam, getQueryParams } from "app/utils/syntax-helpers";
import { IAppConfigProvider } from "app/services/config/app-config-loader.service";
import { NavigateService } from "app/services/navigate.service";
import { resolveInject } from "app/di";
import { RouteComponentProps } from "react-router";
import {
    SearchEngine,
    ChangeListener,
    ChangeEvent,
    ResultData
} from "app/services/data-loader/search-engine.service";
import { SearchOptions } from "app/services/data-loader/data-loader.service";
import { SearchResults } from "app/ui/sections/search-results";
import { TopMenu } from "app/ui/sections/top-menu";

export interface ISearchPageState {
    results?: ResultData;
}

export interface ISearchPageProps extends RouteComponentProps<RouteParams> {}

interface RouteParams {}

/*
 * Page component for searching a thesaurus.
 */
export class SearchPage extends React.Component<ISearchPageProps, ISearchPageState>
    implements ChangeListener {
    public static PATHNAME = "/search";

    private appConfigProvider = resolveInject(IAppConfigProvider);

    constructor(props: ISearchPageProps) {
        super(props);
        this.appConfigProvider.apply(this.props);

        this.state = {};
    }

    componentDidMount() {
        SearchEngine.addChangeListener(this);
        const key = getQueryParam("key", this.props);
        const options = getQueryParams(["limit", "type", "sort"], this.props);
        if (key) {
            this.searchFor(key, options);
        }
    }

    componentWillUnmount() {
        SearchEngine.removeChangeListener(this);
    }

    componentWillReceiveProps(nextProps: ISearchPageProps) {
        this.appConfigProvider.apply(nextProps);
    }

    componentDidUpdate(prevProps: ISearchPageProps) {
        const prevKey = getQueryParam("key", prevProps);
        const currKey = getQueryParam("key", this.props);
        const prevOptions = getQueryParams(["limit", "type", "sort"], prevProps);
        const currOptions = getQueryParams(["limit", "type", "sort"], this.props);
        if (
            currKey &&
            (currKey != prevKey || JSON.stringify(currOptions) != JSON.stringify(prevOptions))
        ) {
            this.searchFor(currKey, currOptions);
        }
    }

    onChange(e: ChangeEvent) {
        const key = e.data.key;
        const options = e.data.options;
        NavigateService.search(key, options);
        this.setState({ results: e.data });
    }

    searchFor(key: string, options?: SearchOptions) {
        options = options || getQueryParams(["limit", "type", "sort"], this.props);
        if (options && !options.limit) {
            options.limit = 10;
        }
        SearchEngine.search(key, options);
    }

    render(): JSX.Element {
        const results = this.state ? this.state.results : undefined;
        return (
            <>
                <TopMenu quicksearch={false} />
                <Container fluid>
                    <Row>
                        <Col className="single-column">
                            <SearchResults results={results} />

                            {results &&
                                results.key &&
                                (!results.matches || results.matches.length == 0) &&
                                !results.key.endsWith("~") && (
                                    <div className="tip search-tip">
                                        Tip: &nbsp;
                                        <Button
                                            id="btn-addSearchProximity"
                                            size="sm"
                                            color="primary"
                                            onClick={() =>
                                                this.searchFor(
                                                    results.key.replace(/[?*]/g, "") + "~",
                                                    Object.assign(
                                                        getQueryParams(
                                                            ["limit", "type"],
                                                            this.props
                                                        ),
                                                        { sort: "az" }
                                                    )
                                                )
                                            }
                                        >
                                            Search for closest terms (~)
                                        </Button>{" "}
                                        or use wildcards &nbsp;
                                        <Button
                                            id="btn-addSearchWildcardQuestionmark"
                                            size="sm"
                                            onClick={() =>
                                                this.searchFor(
                                                    results.key.substr(0, 1) +
                                                        "?" +
                                                        results.key.substr(2)
                                                )
                                            }
                                        >
                                            ?
                                        </Button>
                                        &nbsp;
                                        <Button
                                            id="btn-addSearchWildcardAsterisk"
                                            size="sm"
                                            onClick={() =>
                                                this.searchFor(
                                                    results.key.substr(0, 1) +
                                                        "*" +
                                                        results.key.substr(2)
                                                )
                                            }
                                        >
                                            *
                                        </Button>
                                        <UncontrolledTooltip
                                            placement="top"
                                            target="btn-addSearchProximity"
                                        >
                                            search for close textual matches: simply append ~
                                        </UncontrolledTooltip>
                                        <UncontrolledTooltip
                                            placement="bottom"
                                            target="btn-addSearchWildcardQuestionmark"
                                        >
                                            substitute any single character
                                        </UncontrolledTooltip>
                                        <UncontrolledTooltip
                                            placement="bottom"
                                            target="btn-addSearchWildcardAsterisk"
                                        >
                                            substitute any sequence of characters
                                        </UncontrolledTooltip>
                                    </div>
                                )}
                        </Col>
                    </Row>
                </Container>
            </>
        );
    }
}
