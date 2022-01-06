// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { AppConfigAccess } from "app/services/config/app-config";
import { Badge, Button, Collapse } from "reactstrap";
import { BrowsePage } from "app/ui/pages/browse.page";
import { Dataset } from "app/services/infrastructure/data-catalog";
import { IAppConfigProvider } from "app/services/config/app-config-loader.service";
import { Link } from "react-router-dom";
import { NavigateService } from "app/services/navigate.service";
import { resolveInject } from "app/di";
import { Search } from "app/ui/components/search";
import { StatisticsPage } from "app/ui/pages/statistics.page";
import { UserPage } from "app/ui/pages/user.page";

export type TopMenuElement = "logo" | "datasets" | "navigation" | "search";

export interface ITopMenuProps {
    showElements?: TopMenuElement[];
    quicksearch?: boolean;
}

interface ITopMenuState {
    showElements: TopMenuElement[];
    configuring?: boolean;
}

export class TopMenu extends React.Component<ITopMenuProps, ITopMenuState> {
    constructor(props: ITopMenuProps) {
        super(props);
        const showElements = props.showElements
            ? props.showElements
            : (["logo", "datasets", "navigation", "search"] as TopMenuElement[]);
        this.state = { showElements };
        this.toggleConfiguring = this.toggleConfiguring.bind(this);
    }

    render(): JSX.Element | null {
        const appConfig = resolveInject(IAppConfigProvider).config;
        const { quicksearch } = this.props;
        const { showElements } = this.state;
        const datasetCount = appConfig.datasetsEnabled.length;
        const mainDatasetIri = datasetCount == 0 ? undefined : appConfig.datasetsEnabled[0];
        const mainDatasetInfo =
            mainDatasetIri && AppConfigAccess.getDataset(mainDatasetIri, appConfig);
        const hasDatasetButtons = this.hasDatasetButtons();
        const currentPath = NavigateService.getCurrentPathname();
        const localDataServiceEnabled = appConfig.localDataServiceEnabled;
        return (
            <div id="topmenu">
                <nav className="navigation-main navbar navbar-expand-lg navbar-light">
                    {showElements.includes("logo") && (
                        <a className="navbar-brand" href="./">
                            <img src="static/img/evoke.svg" width="45" alt="evoke" />
                        </a>
                    )}

                    <div className="mr-auto" id="navbarSupportedContent">
                        {showElements.includes("datasets") && (
                            <ul className="navbar-nav" style={{ flexDirection: "row" }}>
                                <li className="nav-item active">
                                    <a
                                        className="nav-link"
                                        target="_blank"
                                        href={
                                            mainDatasetInfo
                                                ? mainDatasetInfo.landingPage
                                                : mainDatasetIri
                                        }
                                    >
                                        <span id="title-placeholder">
                                            {mainDatasetInfo
                                                ? mainDatasetInfo.title
                                                : mainDatasetIri
                                                    ? "Unrecognised dataset: " + mainDatasetIri
                                                    : "Please select a thesaurus"}
                                        </span>
                                        <span className="sr-only">(current)</span>
                                    </a>
                                </li>
                                {datasetCount > 1 && (
                                    <li className="nav-item" style={{ alignSelf: "center" }}>
                                        <Badge
                                            color="secondary"
                                            onClick={this.toggleConfiguring}
                                            style={{ cursor: "pointer" }}
                                        >
                                            +{datasetCount - 1}
                                        </Badge>
                                    </li>
                                )}
                                {hasDatasetButtons && (
                                    <li className="nav-item">
                                        <a
                                            className={
                                                "nav-link oi oi-caret-" +
                                                (this.state.configuring ? "top" : "bottom")
                                            }
                                            onClick={this.toggleConfiguring}
                                            style={{
                                                cursor: "pointer",
                                                lineHeight: "unset",
                                                fontSize: "smaller"
                                            }}
                                        />
                                    </li>
                                )}
                            </ul>
                        )}
                    </div>
                    {showElements.includes("navigation") && (
                        <span>
                            {currentPath != BrowsePage.PATHNAME && (
                                <a
                                    style={{ cursor: "pointer" }}
                                    onClick={() =>
                                        NavigateService.browseWithParams(
                                            NavigateService.getCurrentParameters()
                                        )
                                    }
                                >
                                    <span
                                        className="oi oi-book ml-auto"
                                        style={{ marginRight: "0.5em" }}
                                    />
                                </a>
                            )}
                            {currentPath != StatisticsPage.PATHNAME && (
                                <a
                                    style={{ cursor: "pointer" }}
                                    onClick={() =>
                                        NavigateService.statisticsWithParams(
                                            NavigateService.getCurrentParameters()
                                        )
                                    }
                                >
                                    <span
                                        className="oi oi-graph ml-auto"
                                        style={{ marginRight: "0.5em" }}
                                    />
                                </a>
                            )}
                            {currentPath != UserPage.PATHNAME && (
                                <Link to={UserPage.PATHNAME}>
                                    <span
                                        className="oi oi-person ml-auto"
                                        style={{
                                            marginRight: "0.5em",
                                            color: localDataServiceEnabled ? "black" : "darkgrey"
                                        }}
                                    />
                                </Link>
                            )}
                        </span>
                    )}
                    {showElements.includes("search") && (
                        <Search quicksearch={quicksearch === undefined ? true : quicksearch} />
                    )}
                </nav>

                <Collapse isOpen={this.state.configuring && hasDatasetButtons}>
                    <div id="configuration-bar">
                        <div className="d-flex" style={{ alignItems: "center" }}>
                            <span className="nav-link oi oi-box" />
                            <span>Show data from:</span>
                            {this.renderDatasetButtons()}
                            <button
                                type="button"
                                className="close ml-auto"
                                aria-label="Close"
                                onClick={() => this.setState({ configuring: false })}
                            >
                                <span
                                    aria-hidden="true"
                                    style={{ color: "white", marginRight: "0.25em" }}
                                >
                                    &times;
                                </span>
                            </button>
                        </div>
                        <hr
                            style={{
                                margin: "1px",
                                backgroundColor: "white",
                                marginTop: "0.5em",
                                marginBottom: "0.15em"
                            }}
                        />
                        <div style={{ marginLeft: "1em", fontSize: "small" }}>
                            {appConfig.datasetsEnabled.length == 0
                                ? "Activate a dataset above to view it as the main content."
                                : "Activate one or more datasets above to view them alongside the main content. Those depicted with a thick bar underneath are available on the same platform as the main content and can be included in statistics."}
                        </div>
                    </div>
                </Collapse>
            </div>
        );
    }

    renderDatasetButtons() {
        const appConfig = resolveInject(IAppConfigProvider).config;
        const datasetsForButtons = this.getDatasetsForButtons();

        return datasetsForButtons.map(set => {
            const setId = set["@id" as keyof Dataset];

            // obtain url parameters to use with onClick
            const params = NavigateService.getCurrentParameters();
            const sourceParams = params.getAll("source");
            const setIndex = sourceParams.indexOf(set.identifier);
            if (setIndex >= 0) {
                sourceParams.splice(setIndex, 1);
            } else {
                sourceParams.push(set.identifier);
            }
            params.delete("source");
            sourceParams.forEach(source => params.append("source", source));

            return (
                <Button
                    key={setId}
                    style={setId == appConfig.datasetsEnabled[0] ? { display: "none" } : {}} // do not show base dataset
                    outline={appConfig.datasetsEnabled.includes(setId) ? false : true}
                    className={this.isServedByMainService(setId) ? "btn-underline-thick" : ""}
                    color="primary"
                    onClick={() => NavigateService.setParams(params)}
                >
                    {set.title}
                </Button>
            );
        });
    }

    hasDatasetButtons(): boolean {
        const appConfig = resolveInject(IAppConfigProvider).config;
        const datasetCount = this.getDatasetsForButtons().length;
        return datasetCount > 0 && (appConfig.datasetsEnabled.length == 0 || datasetCount > 1);
    }

    getDatasetsForButtons(): Dataset[] {
        const appConfig = resolveInject(IAppConfigProvider).config;
        const sets = [];
        for (const set of appConfig.catalog.dataset) {
            const setId = set["@id" as keyof Dataset];

            // ensure a dataservice is indeed available for the set
            const dataService = AppConfigAccess.getDataService(
                set.distribution.accessService,
                appConfig
            );
            if (!dataService || !dataService.servesDataset.includes(setId)) {
                continue;
            }

            // ensure any requirements for the set, if the set is not already enabled, are available
            if (!appConfig.datasetsEnabled.includes(setId) && set.requires) {
                let include = true;
                for (const requiredSet of set.requires) {
                    if (!appConfig.datasetsEnabled.includes(requiredSet)) {
                        include = false;
                    }
                }
                if (!include) {
                    continue;
                }
            }

            sets.push(set);
        }
        return sets;
    }

    isServedByMainService(setId: string): boolean {
        const appConfig = resolveInject(IAppConfigProvider).config;
        if (appConfig.datasetsEnabled.length >= 1) {
            const mainDataset = appConfig.datasetsEnabled[0];
            const mainService = AppConfigAccess.getDataServiceForDataset(mainDataset, appConfig);
            const setService = AppConfigAccess.getDataServiceForDataset(setId, appConfig);
            return setService == mainService;
        }
        return false;
    }

    toggleConfiguring() {
        const toggledValue = this.state.configuring ? false : true;
        this.setState({ configuring: toggledValue });
    }
}
