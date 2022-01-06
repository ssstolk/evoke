// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { DataLoader } from "app/services/data-loader/data-loader.service";
import { EvokeResourceType } from "app/ui/elements/ld-resource-item";
import { getAnnotationInfo } from "app/ui/tabs/annotation.info";
import { getConceptInfo } from "app/ui/tabs/concept.info";
import { getConceptList } from "app/ui/tabs/concept.list";
import { getConceptStatistics } from "app/ui/tabs/concept.statistics";
import { getConceptWordcloud } from "app/ui/tabs/concept.wordcloud";
import { getConceptWordcloudAssociatedConcepts } from "app/ui/tabs/concept.wordcloud.associated.concepts";
import { getEntryInfo } from "app/ui/tabs/entry.info";
import { getEntryList } from "app/ui/tabs/entry.list";
import { getEntryWordcloud } from "app/ui/tabs/entry.wordcloud";
import { getLDResourceItem } from "app/ui/elements/ld-resource-item";
import { getResourceInfo } from "app/ui/tabs/resource.info";
import { getSenseInfo } from "app/ui/tabs/sense.info";
import { getSenseList } from "app/ui/tabs/sense.list";
import { getSenseWordcloud } from "app/ui/tabs/sense.wordcloud";
import { inTabPane, renderTabLink } from "app/ui/_generic/tab";
import { Nav, TabContent } from "reactstrap";
import { NavigateService } from "app/services/navigate.service";

interface IInformationPaneState {
    activeTabId: string | undefined;
    termType: EvokeResourceType | null | undefined;
    prevIri?: string;
}

interface IInformationPaneProps {
    iri?: string;
    preferredTab?: string;
}

/*
 * Component that represents an information pane, which contains a number
 * of tabs. Which tabs are displayed depends on the type of the resource.
 */
export class InformationPane extends React.Component<IInformationPaneProps, IInformationPaneState> {
    constructor(props: IInformationPaneProps) {
        super(props);
        this.toggleActiveTab = this.toggleActiveTab.bind(this);
        this.state = {
            activeTabId: this.props.preferredTab,
            termType: undefined
        };
    }

    async componentDidMount() {
        this.loadData();
    }

    static getDerivedStateFromProps(props: IInformationPaneProps, state: IInformationPaneState) {
        if (props.iri !== state.prevIri || props.preferredTab !== state.activeTabId) {
            return {
                activeTabId: props.preferredTab,
                termType: undefined,
                prevIri: props.iri
            };
        }
        // No state update necessary
        return null;
    }

    async componentDidUpdate(prevProps: IInformationPaneProps, prevState: IInformationPaneState) {
        if (this.state.termType === undefined) {
            DataLoader.unsubscribe(this);
            await this.loadData();
        }
    }

    componentWillUnmount() {
        DataLoader.unsubscribe(this);
    }

    async loadData() {
        DataLoader.unsubscribe(this);
        if (this.state.termType !== undefined) {
            this.setState({ termType: undefined });
        }

        const iri = this.props.iri;
        if (iri) {
            const termType = await DataLoader.subscribe(this, DataLoader.loadResourceType(iri));
            //            const termType = await DataLoader.loadResourceType(iri);
            this.setState({ termType });
        }
    }

    getTabs() {
        const iri = this.props.iri;
        const termType = this.state.termType;
        const tabs: JSX.Element[] = [];

        if (!iri || termType === undefined) {
            return tabs;
        }

        switch (termType) {
            case "concept":
            case "label":
                {
                    // info tab: displays generic information on the concept
                    const Tab = inTabPane(getConceptInfo(iri));
                    const tab = this.createTab(Tab, "info", "conceptInfo", "info", "oi oi-info");
                    tabs.push(tab);
                }
                {
                    // list tab: lists lexical senses of the concept
                    const Tab = inTabPane(getConceptList(iri));
                    const tab = this.createTab(
                        Tab,
                        "list",
                        "conceptList",
                        "list",
                        "oi oi-list",
                        true
                    );
                    tabs.push(tab);
                }
                if (termType == "label") {
                    break;
                } /* TODO: concept and label should be identical in information presented */
                {
                    // statistics tab: displays statistics on the senses and entries categorised under the concept
                    const Tab = inTabPane(getConceptStatistics(iri));
                    const tab = this.createTab(
                        Tab,
                        "statistics",
                        "conceptStatistics",
                        "statistics",
                        "oi oi-graph"
                    );
                    tabs.push(tab);
                }
                {
                    // wordcloud tab: displays a wordcloud of the senses categorised under the concept
                    const Tab = inTabPane(getConceptWordcloud(iri));
                    const tab = this.createTab(
                        Tab,
                        "wordcloud",
                        "conceptWordcloud",
                        "wordcloud",
                        "oi oi-cloud"
                    );
                    tabs.push(tab);
                }
                {
                    // wordcloud tab: displays a wordcloud of the concepts associated with the current concept
                    const Tab = inTabPane(getConceptWordcloudAssociatedConcepts(iri));
                    const tab = this.createTab(
                        Tab,
                        "associations",
                        "conceptWordcloudAssociatedConcepts",
                        "associations",
                        "oi oi-star"
                    );
                    tabs.push(tab);
                }
                break;
            case "entry":
                {
                    // info tab: displays generic information on the entry
                    const Tab = inTabPane(getEntryInfo(iri));
                    const tab = this.createTab(
                        Tab,
                        "info",
                        "entryInfo",
                        "info",
                        "oi oi-info",
                        true
                    );
                    tabs.push(tab);
                }
                {
                    // list tab: displays all senses (by means of concepts) of the entry
                    const Tab = inTabPane(getEntryList(iri));
                    const tab = this.createTab(Tab, "list", "entryList", "list", "oi oi-list");
                    tabs.push(tab);
                }
                {
                    // wordcloud tab: displays a wordcloud of the concepts associated with all the senses for the lexical entry
                    const Tab = inTabPane(getEntryWordcloud(iri));
                    const tab = this.createTab(
                        Tab,
                        "wordcloud",
                        "entryWordcloud",
                        "wordcloud",
                        "oi oi-cloud"
                    );
                    tabs.push(tab);
                }
                break;
            case "sense":
                {
                    // info tab: displays generic information on the sense
                    const Tab = inTabPane(getSenseInfo(iri));
                    const tab = this.createTab(
                        Tab,
                        "info",
                        "senseInfo",
                        "info",
                        "oi oi-info",
                        true
                    );
                    tabs.push(tab);
                }
                {
                    // list tab: displays all senses (by means of concepts) for the associated lexical entry
                    const Tab = inTabPane(getSenseList(iri));
                    const tab = this.createTab(Tab, "list", "senseList", "list", "oi oi-list");
                    tabs.push(tab);
                }
                {
                    // wordcloud tab: displays a wordcloud of the concepts associated with all the senses for the associated lexical entry
                    const Tab = inTabPane(getSenseWordcloud(iri));
                    const tab = this.createTab(
                        Tab,
                        "wordcloud",
                        "senseWordcloud",
                        "wordcloud",
                        "oi oi-cloud"
                    );
                    tabs.push(tab);
                }
                break;
            case "annotation":
                {
                    // info tab: displays generic information on the sense
                    const Tab = inTabPane(getAnnotationInfo(iri));
                    const tab = this.createTab(
                        Tab,
                        "info",
                        "annotationInfo",
                        "info",
                        "oi oi-info",
                        true
                    );
                    tabs.push(tab);
                }
                break;
            default: {
                // info tab: displays generic information on the concept
                const Tab = inTabPane(getResourceInfo(iri));
                const tab = this.createTab(Tab, "info", "resourceInfo", "info", "oi oi-info", true);
                tabs.push(tab);
            }
        }

        return tabs;
    }

    createTab(
        TabType: any,
        id: string,
        className: string,
        name: string,
        icon: string,
        defaultTab?: boolean
    ) {
        const activeTabId = this.state.activeTabId;
        const iri = this.props.iri;
        return (
            <TabType
                id={id}
                key={id}
                className={className}
                name={name}
                icon={icon}
                defaultTab={defaultTab}
                active={(activeTabId === undefined && defaultTab) || id == activeTabId}
                onSelect={() => {
                    this.toggleActiveTab(id);
                }}
                iri={iri}
            />
        );
    }

    toggleActiveTab(tabId: string) {
        if (this.state.activeTabId !== tabId) {
            const params = NavigateService.getCurrentParameters();
            params.set("tab", tabId);
            NavigateService.browseWithParams(params);
        }
    }

    /* Retrieves the id of the active tab */
    getActiveTabId(tabs: JSX.Element[]): string | undefined {
        for (const tab of tabs) {
            if (tab.props.active) {
                return tab.props.id;
            }
        }
        return undefined;
    }

    getActiveTab(tabs: JSX.Element[]): JSX.Element | null {
        const activeTabId = this.state.activeTabId;
        for (const tab of tabs) {
            const active =
                (activeTabId === undefined && tab.props.defaultTab) || tab.props.id == activeTabId;
            if (active) {
                return tab;
            }
        }
        return null;
    }

    render() {
        const iri = this.props.iri;
        const tabs: JSX.Element[] = this.getTabs();
        const activeTabId = this.getActiveTabId(tabs);

        if (!iri) {
            return null;
        }

        const ResourceItem = getLDResourceItem({ iri });

        return (
            <section className="rounded border border-dark">
                <div>
                    <Nav tabs>
                        <h3 className="mr-auto">
                            <ResourceItem />
                        </h3>
                        {tabs.map((tab: JSX.Element) => {
                            return renderTabLink(tab.props);
                        })}
                    </Nav>
                </div>
                <TabContent activeTab={activeTabId}>{this.getActiveTab(tabs)}</TabContent>
            </section>
        );
    }
}
