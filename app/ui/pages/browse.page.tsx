// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { Col, Container, Row } from "reactstrap";
import { getQueryParam } from "app/utils/syntax-helpers";
import { IAppConfigProvider } from "app/services/config/app-config-loader.service";
import { InformationPane } from "app/ui/sections/information.pane";
import { resolveInject } from "app/di";
import { RouteComponentProps } from "react-router";
import { Taxonomy } from "app/ui/sections/taxonomy";
import { TopMenu } from "app/ui/sections/top-menu";

interface RouteParams {}

export interface IBrowsePageProps extends RouteComponentProps<RouteParams> {}

interface IBrowsePageState {
    iri?: string;
}

/*
 * Page component for browsing a hierarchy and seeing information on the
 * currently selected term (stored as an ITerm, which includes an iri, name,
 * and icon). If solely the iri of the current term is known during loading,
 * the further information will be loaded in the 'loadData' function to fill
 * in the missing information, which is then processed and disseminated to
 * child components that depend on the information.
 */
export class BrowsePage extends React.Component<IBrowsePageProps, IBrowsePageState> {
    public static PATHNAME = "/view";

    private appConfigProvider = resolveInject(IAppConfigProvider);

    constructor(props: IBrowsePageProps) {
        super(props);
        const iri = getQueryParam("iri", this.props);
        this.appConfigProvider.apply(this.props);

        this.state = {
            iri: iri
        };
    }

    componentWillReceiveProps(nextProps: IBrowsePageProps) {
        const iri = this.state.iri;
        const newIri = getQueryParam("iri", nextProps);
        this.appConfigProvider.apply(nextProps);

        if (newIri !== iri) {
            this.setState({
                iri: newIri
            });
            this.forceUpdate();
        }
    }

    render(): JSX.Element {
        const iri = this.state.iri;
        const tabId = getQueryParam("tab", this.props);
        const config = this.appConfigProvider.config;
        const dataPresent = config.datasetsEnabled.length > 0;
        return (
            <>
                <TopMenu quicksearch={true} />
                {dataPresent && (
                    <Container fluid>
                        <Row>
                            <Col className="single-column">
                                <Taxonomy iri={iri} />
                                <InformationPane iri={iri} preferredTab={tabId} />
                            </Col>
                        </Row>
                    </Container>
                )}
            </>
        );
    }
}
