// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as cn from "classnames";
import * as React from "react";
import { NavItem, NavLink, TabPane, UncontrolledTooltip } from "reactstrap";

export interface ITabProps {
    id: string;
    name: string;
    icon: string;
    onSelect: () => void;

    defaultTab?: boolean;
    active?: boolean;
    iri: string;
}

export function inTabPane(WrappedComponent: React.ComponentType) {
    return class Tabpane extends React.PureComponent<ITabProps> {
        render(): JSX.Element {
            const {
                id,
                name,
                icon,
                onSelect,
                defaultTab,
                active,
                ...passThroughProps
            } = this.props;

            return (
                <TabPane tabId={id} id={id} key={id}>
                    <WrappedComponent {...passThroughProps} />
                </TabPane>
            );
        }
    };
}

export function renderTabLink(props: ITabProps): JSX.Element | null {
    const active = props.active || false;
    const onSelect = props.onSelect;

    const id = props.id;
    return (
        <NavItem key={`tabitem-${id}`} style={{ marginTop: "auto" }}>
            <NavLink
                className={cn({ active })}
                id={`tablink-${id}`}
                key={`tablink-${id}`}
                onClick={onSelect}
            >
                <span className={props.icon} />
            </NavLink>
            <UncontrolledTooltip placement="top" target={`tablink-${id}`}>
                {props.name}
            </UncontrolledTooltip>
        </NavItem>
    );
}
