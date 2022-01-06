// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { AboutPage } from "app/ui/pages/about.page";
import { appHistory } from "app/services/infrastructure/router-history";
import { BrowsePage } from "app/ui/pages/browse.page";
import { Redirect, Route, Router, Switch } from "react-router-dom";
import { SearchPage } from "app/ui/pages/search.page";
import { StatisticsPage } from "app/ui/pages/statistics.page";
import { UserPage } from "app/ui/pages/user.page";

export class Main extends React.Component {
    render(): JSX.Element {
        return (
            <Router history={appHistory}>
                <>
                    <Switch>
                        <Route exact path={AboutPage.PATHNAME} component={AboutPage} />
                        <Route exact path={BrowsePage.PATHNAME} component={BrowsePage} />
                        <Route exact path={SearchPage.PATHNAME} component={SearchPage} />
                        <Route exact path={StatisticsPage.PATHNAME} component={StatisticsPage} />
                        <Route exact path={UserPage.PATHNAME} component={UserPage} />
                        <Redirect from="/" to={BrowsePage.PATHNAME} />
                    </Switch>
                </>
            </Router>
        );
    }
}
