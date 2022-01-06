// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";

interface IComponentProps {
    error: Error;
}

const DefaultErrorText = "Error";

export const ErrorMessage = (props: IComponentProps) => {
    let errorMessage: string = "";
    if (props.error instanceof Error) {
        errorMessage = props.error.message || DefaultErrorText;
    } else if (typeof props.error === "string") {
        errorMessage = props.error || DefaultErrorText;
    } else {
        errorMessage = DefaultErrorText;
    }

    return (
        <div className="error-message-component">
            <pre>{errorMessage}</pre>
        </div>
    );
};
