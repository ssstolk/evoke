// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { Breadcrumb, BreadcrumbItem, Button } from "reactstrap";
import { getLDResourceItem } from "app/ui/elements/ld-resource-item";
import { getRecordValue } from "app/services/infrastructure/sparql-result-parser";
import { Link } from "react-router-dom";
import { NavigateService } from "app/services/navigate.service";

export interface ILDResourceCategorizationsProps {
    data?: any;
}

export interface ILDResourceListingState {
    expandedEntry: { [key: string]: boolean };
}

export class LDResourceCategorizations extends React.Component<
    ILDResourceCategorizationsProps,
    ILDResourceListingState
> {
    constructor(props: ILDResourceCategorizationsProps) {
        super(props);
        this.state = { expandedEntry: {} };
    }

    toggleExpand(entryIri: string) {
        const expandedEntry = this.state.expandedEntry;
        expandedEntry[entryIri] = !expandedEntry[entryIri];
        this.setState({ expandedEntry });
    }

    render(): JSX.Element | null {
        const { data } = this.props;
        const expandedEntry = this.state.expandedEntry;

        return (
            <>
                {data.map((record: any) => {
                    const GroupItem = getLDResourceItem({ resource: record["group"] });
                    const entryIri = getRecordValue(record, "entry");
                    const entryLink = NavigateService.getBrowseLink(entryIri);
                    return (
                        <Breadcrumb
                            tag="nav"
                            key={entryIri}
                            onClick={() => {
                                /*this.toggleExpand(entryIri);*/
                            }}
                        >
                            <BreadcrumbItem>
                                <GroupItem />
                            </BreadcrumbItem>
                            <Link to={entryLink} className="ml-auto">
                                <Button size="sm">&gt;</Button>
                            </Link>
                        </Breadcrumb>
                    );
                })}
            </>
        );
    }
}
