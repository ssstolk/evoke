// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { Dropdown } from "reactstrap";

export interface IDropdownProps {
    defaultOpen?: boolean;
    onToggle?: Function;
    direction?: any;
}

interface IDropdownState {
    isOpen: boolean;
}

export default class ReactstrapDropdown extends React.Component<IDropdownProps, IDropdownState> {
    constructor(props: IDropdownProps) {
        super(props);
        this.state = { isOpen: props.defaultOpen || false };
        this.toggle = this.toggle.bind(this);
    }

    toggle(e?: any) {
        this.setState({ isOpen: !this.state.isOpen });
        if (this.props.onToggle) {
            this.props.onToggle(e, !this.state.isOpen);
        }
    }

    render() {
        return (
            <Dropdown
                direction={this.props.direction ? this.props.direction : "down"}
                isOpen={this.state.isOpen}
                toggle={this.toggle}
            >
                {this.props.children}
            </Dropdown>
        );
    }
}
