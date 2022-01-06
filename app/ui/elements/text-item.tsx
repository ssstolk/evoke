// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { Link } from "react-router-dom";

/*
 * Component that represents a text item, which may link,
 * be preceded by an icon, carry a badge and/or be highlighted.
 */
export const TextItem = (props: {
    text: string;
    link?: string;
    icon?: string;
    isLabel?: boolean;
    onClick?: () => void;
}) => {
    const { text, link, icon, isLabel } = props;

    let item: any = text ? text : "";

    // to={"?uri=" + encodeURIComponent(link)}
    if (icon) {
        item = (
            <>
                <span className={`text-item-icon ${icon}`} /> {item}
            </>
        );
    }
    if (link) {
        item = (
            <Link to={link} onClick={props.onClick}>
                {item}
            </Link>
        );
    }
    if (isLabel) {
        item = <span className="text-item-badge badge">{item}</span>;
    }

    return (
        <span className="text-item" onClick={props.onClick}>
            {item}
        </span>
    );
};
