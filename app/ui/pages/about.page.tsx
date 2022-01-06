// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";

export class AboutPage extends React.Component {
    public static PATHNAME = "/about";

    render() {
        return (
            <div className="container">
                <div className="row">
                    <div className="one-half column" style={{ marginTop: "25%" }}>
                        <h4>Application information</h4>
                        <p>Build #{build_info.version}</p>
                    </div>
                </div>
            </div>
        );
    }
}
