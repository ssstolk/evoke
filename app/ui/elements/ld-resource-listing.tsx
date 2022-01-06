// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { DropdownToggle, DropdownMenu, DropdownItem } from "reactstrap";
import { getLDResourceItem, ILDResourceItemProps } from "./ld-resource-item";
import { getRecordValue, SparqlRecord } from "app/services/infrastructure/sparql-result-parser";
import ReactstrapDropdown from "./reactstrap-dropdown";

import "./ld-resource-listing.less";

export interface ILDResourceListingProps {
    data: SparqlRecord[];
    group?: ILDResourceItemProps;
    menu?: (data: SparqlRecord, group?: ILDResourceItemProps) => any;
}

interface ILDResourceListingState {
    showItemCount: number;
}

/*
 * Component that represents a listing of groups. Each group listing consists
 * of a header and an unordered list. The group header and its items are based
 * on the SPARQL query passed, along with its query parameters.
 */
export class LDResourceListing extends React.Component<
    ILDResourceListingProps,
    ILDResourceListingState
> {
    PAGINATION_COUNT = 100;

    constructor(props: ILDResourceListingProps) {
        super(props);
        this.state = {
            showItemCount: this.PAGINATION_COUNT
        };
    }

    render() {
        if (this.isEmpty()) {
            return null;
        }

        return this.renderListing();
    }

    shouldComponentUpdate(nextProps: ILDResourceListingProps, nextState: ILDResourceListingState) {
        return (
            nextProps.data !== this.props.data ||
            nextState.showItemCount != this.state.showItemCount
        );
    }

    // getLDResourceItem(props: ILDResourceItemProps) {
    //     const iri = props.iri || (props.resource && (props.resource.type == "uri") && props.resource.value);
    //     if (iri) {
    //         const item = this.cachedItems[iri] || getLDResourceItem(props);
    //         this.cachedItems[iri] = item;
    //         return item;
    //     }
    //     return getLDResourceItem(props);
    // }

    renderGroupHeader(record: SparqlRecord) {
        const groupProps = this.props.group ? this.props.group : { resource: record["group"] };
        const key: string = `list-group-${this.getGroupKey(record)}`;
        const GroupItem = getLDResourceItem(groupProps);
        return (
            <div
                key={key}
                className="ld-resource-listing-group d-flex justify-content-between align-items-center"
            >
                <GroupItem />
            </div>
        );
    }

    renderGroupEntries(groupRecord: SparqlRecord) {
        const records = this.props.data;
        const { showItemCount } = this.state;
        return records.map((record, irow) => {
            return irow <= showItemCount && this.isSameGroup(record, groupRecord)
                ? this.renderEntry(record)
                : null;
        });
    }

    renderEntry(record: SparqlRecord) {
        const key: string = `list-entry-${this.getGroupKey(record)}-${this.getEntryKey(record)}`;
        const EntryItem = getLDResourceItem({ resource: record["entry"], showLabels: true });
        const menuOptions =
            (this.props.menu
                ? this.props.menu(record, { resource: record["group"] } || this.props.group)
                : []) || [];
        const hasMenu = menuOptions.length > 0;
        return (
            <li
                key={key}
                style={{ flexWrap: "wrap" }}
                className={
                    "ld-resource-listing-entry list-group-item d-flex justify-content-between align-items-center" +
                    (hasMenu ? " item-bearing-menu" : "")
                }
            >
                <EntryItem showLabels={true} />

                {hasMenu && (
                    <ReactstrapDropdown direction="left">
                        <DropdownToggle
                            tag="span"
                            data-toggle="dropdown"
                            className="ld-resource-listing-entry-menu"
                        >
                            ⋮
                        </DropdownToggle>
                        <DropdownMenu>
                            {menuOptions.map((item: any) => {
                                return (
                                    <DropdownItem
                                        key={item.key}
                                        onClick={e => {
                                            e.preventDefault();
                                            item.function(
                                                record,
                                                { resource: record["group"] } || this.props.group
                                            );
                                        }}
                                    >
                                        {item.name}
                                    </DropdownItem>
                                );
                            })}
                        </DropdownMenu>
                    </ReactstrapDropdown>
                )}
            </li>
        );
    }

    renderListing() {
        const { data } = this.props;
        const { showItemCount } = this.state;
        let groupRecord: SparqlRecord;
        return (
            <div className="ld-resource-listing">
                {data.map((record, index) => {
                    if (
                        index < showItemCount &&
                        !this.isEmptyRecord(record) &&
                        (!groupRecord || !this.isSameGroup(record, groupRecord))
                    ) {
                        groupRecord = record;
                        return (
                            <div
                                className="ld-resource-listing-list"
                                key={`list-${this.getGroupKey(record)}`}
                            >
                                {this.props.group || this.hasGroup(groupRecord) ? (
                                    this.renderGroupHeader(groupRecord)
                                ) : (
                                    <></>
                                )}
                                <ul
                                    className="ld-resource-listing-entries"
                                    key={`list-entries-${this.getGroupKey(record)}`}
                                >
                                    {this.renderGroupEntries(groupRecord)}
                                </ul>
                            </div>
                        );
                    }
                    return null;
                })}
                {showItemCount < data.length && (
                    <div>
                        Currently showing the first {showItemCount} items. Click{" "}
                        <span
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                                this.setState({
                                    showItemCount: showItemCount + this.PAGINATION_COUNT
                                });
                            }}
                        >
                            <em>here</em>
                        </span>{" "}
                        to see the next {this.PAGINATION_COUNT}.
                    </div>
                )}
            </div>
        );
    }

    isEmpty(): boolean {
        const records = this.props.data;
        return !(records && records.length > 0 && this.hasEntry(records[0]));
    }

    isEmptyRecord(record: SparqlRecord): boolean {
        return !this.hasEntry(record);
    }

    hasGroup(record: SparqlRecord): boolean {
        if (!record) {
            return false;
        }
        const text = getRecordValue(record, "group_text");
        const iri = getRecordValue(record, "group");
        if ((text && text.length > 0) || (iri && iri.length > 0)) {
            return true;
        }
        return false;
    }

    hasEntry(record: SparqlRecord): boolean {
        if (!record) {
            return false;
        }
        const text = getRecordValue(record, "entry_text");
        const iri = getRecordValue(record, "entry");
        if ((text && text.length > 0) || (iri && iri.length > 0)) {
            return true;
        }
        return false;
    }

    isSameGroup(lhs: SparqlRecord, rhs: SparqlRecord): boolean {
        if (this.hasGroup(lhs) != this.hasGroup(rhs)) {
            return false;
        }
        if (!this.hasGroup(lhs)) {
            return true;
        }
        if (
            getRecordValue(lhs, "group_text") != getRecordValue(rhs, "group_text") ||
            getRecordValue(lhs, "group") != getRecordValue(rhs, "group")
        ) {
            return false;
        }
        return true;
    }

    getGroupKey(record: SparqlRecord): string {
        const iri = getRecordValue(record, "group");
        const text = getRecordValue(record, "group_text");
        return "group{iri:" + iri + "&text:" + text + "}";
    }

    getEntryKey(record: SparqlRecord): string {
        const iri = getRecordValue(record, "entry");
        const text = getRecordValue(record, "entry_text");
        return "entry{iri:" + iri + "&text:" + text + "}";
    }
}
