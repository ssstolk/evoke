// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { ErrorMessage } from "app/ui/_generic/error-message";

export const ErrorPage = (props: { error: Error }) => {
    const { error } = props;

    return (
        <div className="container">
            <br />
            <br />
            <ErrorMessage error={error} />
        </div>
    );
};
