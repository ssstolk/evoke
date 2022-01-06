// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { AppConfigAccess } from "app/services/config/app-config";
import {
    Button,
    Col,
    Container,
    CustomInput,
    Form,
    FormGroup,
    Input,
    Label,
    Row,
    UncontrolledCollapse
} from "reactstrap";
import { Dataset } from "app/services/infrastructure/data-catalog";
import { FileHelper } from "app/utils/file-helper";
import { IAppConfigProvider } from "app/services/config/app-config-loader.service";
import { LocalData } from "app/utils/localdata-helper";
import { LocalSparqlExecutor } from "app/services/infrastructure/sparql-executor";
import { NavigateService } from "app/services/navigate.service";
import { resolveInject } from "app/di";

interface UserPageState {
    publishingDataset: string;
    publishingDataService: string;
    publishingUsername: string;
    publishingPassword: string;
    isPublished: boolean;
    localDataServiceEnabled: boolean;
}

export class UserPage extends React.Component<{}, UserPageState> {
    public static PATHNAME = "/user";

    private appConfigProvider = resolveInject(IAppConfigProvider);

    constructor(props: any) {
        super(props);
        this.state = {
            publishingDataset: "",
            publishingDataService: "",
            publishingUsername: "",
            publishingPassword: "",
            isPublished: false,
            localDataServiceEnabled: this.appConfigProvider.config.localDataServiceEnabled
        };
    }

    render() {
        const { localDataServiceEnabled } = this.state;
        return (
            <>
                <div id="topmenu">
                    <nav className="navigation-main navbar navbar-expand-lg navbar-light">
                        <a className="navbar-brand cr-auto" href="./">
                            <img src="static/img/evoke.svg" width="45" alt="evoke" />
                        </a>
                        <span>
                            <a
                                style={{ cursor: "pointer" }}
                                onClick={() => NavigateService.browseWithParams()}
                            >
                                <span
                                    className="oi oi-book ml-auto"
                                    style={{ marginRight: "0.5em" }}
                                />
                            </a>
                            <a
                                style={{ cursor: "pointer" }}
                                onClick={() => NavigateService.statisticsWithParams()}
                            >
                                <span
                                    className="oi oi-graph ml-auto"
                                    style={{ marginRight: "0.5em" }}
                                />
                            </a>
                        </span>
                    </nav>
                </div>

                <Container fluid>
                    <Row
                        className="align-items-center"
                        style={{ display: "flex", minHeight: "90vh" }}
                    >
                        <Col className="single-column" style={{ flex: 1 }}>
                            <p>
                                Any information you add to Evoke is stored in your browser and is
                                not shared with others on the Web. This page offers functionality to
                                interact with that data via the buttons below.
                            </p>

                            <hr />

                            <p>
                                <Button
                                    className="oi oi-data-transfer-download"
                                    style={{ marginRight: "1em" }}
                                    onClick={() => {
                                        LocalData.download();
                                    }}
                                />
                                <strong>Backup</strong> your local data as a file, which you can
                                share with others.
                            </p>

                            <p>
                                <Button
                                    className="oi oi-data-transfer-upload"
                                    style={{ marginRight: "1em" }}
                                    onClick={() => {
                                        FileHelper.selectFile(
                                            FileHelper.saveSelectedFileInLocalStorage
                                        );
                                        LocalData.repopulate();
                                    }}
                                />
                                <strong>Initialize</strong> your local data with a backup in the
                                JSON-LD or Turtle format.
                            </p>

                            <p>
                                <Button
                                    className="oi oi-cloud"
                                    style={{ marginRight: "1em" }}
                                    id="togglerPublishingForm"
                                />
                                <strong>Publish</strong> your local data to an online data service.
                            </p>
                            {this.renderPublishingForm()}

                            <p>
                                <Button
                                    className="oi oi-delete"
                                    style={{ marginRight: "1em" }}
                                    onClick={() => {
                                        LocalData.repopulateWith(undefined);
                                        alert("Done");
                                    }}
                                />
                                <strong>Discard</strong> your local data.
                            </p>

                            <hr />

                            <p style={{ textAlign: "center" }}>
                                <Button
                                    className="oi oi-person"
                                    style={{ marginRight: "1em" }}
                                    outline={!localDataServiceEnabled}
                                    onClick={() => {
                                        this.setStateLocalDataService(!localDataServiceEnabled);
                                    }}
                                />
                                <strong>{localDataServiceEnabled ? "Hide" : "Show"}</strong> your
                                local data when navigating.
                            </p>
                        </Col>
                    </Row>
                </Container>
            </>
        );
    }

    renderPublishingForm() {
        const config = this.appConfigProvider.config;
        const {
            publishingDataset,
            publishingDataService,
            publishingUsername,
            publishingPassword,
            isPublished
        } = this.state;
        return (
            <UncontrolledCollapse
                toggler="#togglerPublishingForm"
                style={{
                    border: "1px solid lightgrey",
                    borderRadius: "1em",
                    padding: "1em",
                    margin: "2em"
                }}
            >
                <Form>
                    <FormGroup row>
                        <Label sm={2} for="dataset">
                            dataset id
                        </Label>
                        <Col sm={10}>
                            <Input
                                disabled={isPublished}
                                onChange={e => {
                                    this.setState({ publishingDataset: e.target.value });
                                }}
                                type="text"
                                name="dataset"
                                id="dataset"
                                placeholder="a single word in lowercase (e.g., beowulf) or a full graph iri"
                                value={publishingDataset}
                            />
                        </Col>
                    </FormGroup>
                    <FormGroup row>
                        <Label sm={2} for="dataservice">
                            data service
                        </Label>
                        <Col sm={10}>
                            <CustomInput
                                disabled={isPublished}
                                onChange={e => {
                                    this.setState({ publishingDataService: e.target.value });
                                }}
                                type="select"
                                id="dataservice"
                                name="dataservice"
                            >
                                <option value="">select</option>
                                {config.catalog.service
                                    .filter(service => {
                                        return service && service.importURL;
                                    })
                                    .map(service => {
                                        return (
                                            <option key={service["@id"]} value={service["@id"]}>
                                                {service.title}
                                            </option>
                                        );
                                    })}
                            </CustomInput>
                        </Col>
                    </FormGroup>
                    <FormGroup row>
                        <Label sm={2}>credentials</Label>
                        <Label for="username" hidden>
                            username
                        </Label>
                        <Col sm={4}>
                            <Input
                                disabled={isPublished}
                                onChange={e => {
                                    this.setState({ publishingUsername: e.target.value });
                                }}
                                type="text"
                                name="username"
                                id="username"
                                placeholder="username"
                                value={publishingUsername}
                            />
                        </Col>
                        <Label sm={2} for="password" hidden>
                            password
                        </Label>
                        <Col sm={4}>
                            <Input
                                disabled={isPublished}
                                onChange={e => {
                                    this.setState({ publishingPassword: e.target.value });
                                }}
                                type="password"
                                name="password"
                                id="password"
                                placeholder="password"
                                value={publishingPassword}
                            />
                        </Col>
                    </FormGroup>
                    <Button
                        onClick={() => this.publish()}
                        disabled={
                            isPublished ||
                            publishingDataset.length == 0 ||
                            publishingDataService.length == 0
                        }
                    >
                        Publish
                    </Button>{" "}
                    {isPublished && (
                        <Button onClick={() => AppConfigAccess.downloadCatalogue(config)}>
                            Download catalogue
                        </Button>
                    )}
                </Form>
            </UncontrolledCollapse>
        );
    }

    async publish() {
        const config = this.appConfigProvider.config;
        const {
            publishingDataset,
            publishingDataService,
            publishingUsername,
            publishingPassword
        } = this.state;
        const graph = /^(https?)|(urn):/.test(publishingDataset)
            ? publishingDataset
            : "https://w3id.org/evoke/set/" + publishingDataset;

        const dataService = AppConfigAccess.getDataService(publishingDataService, config);
        if (!dataService || !dataService.importURL) {
            alert(
                "The data could not be published, because the configuration lacks an import URL to which the data ought to be published."
            );
            return;
        }
        const importURL = dataService.importURL;

        const data = await LocalSparqlExecutor.create(config)[0].toTurtle();
        const success = await this.publishRDF(
            data,
            "text/turtle",
            importURL,
            graph,
            publishingUsername && publishingUsername.length > 0 ? publishingUsername : undefined,
            publishingPassword && publishingPassword.length > 0 ? publishingPassword : undefined
        );

        if (!success) {
            alert("Publication failed.");
        } else {
            config.catalog.dataset = config.catalog.dataset.filter(dataset => {
                return dataset["@id"] != graph;
            });
            const publishedDataset: Dataset = {
                "@id": graph,
                "@type": "Dataset",
                title: publishingDataset,
                identifier: publishingDataset,
                distribution: {
                    accessService: dataService["@id"],
                    accessGraph: graph,
                    mediaType: "application/sparql-results+json"
                }
            };
            if (config.datasetsEnabled.length > 0 && config.datasetsEnabled[0] != graph) {
                publishedDataset.requires = [config.datasetsEnabled[0]];
            }
            config.catalog.dataset.push(publishedDataset);
            const service = AppConfigAccess.getDataService(dataService["@id"], config);
            if (service) {
                const datasetsServed = service.servesDataset || [];
                if (!datasetsServed.includes(graph)) {
                    datasetsServed.push(graph);
                }
                service.servesDataset = datasetsServed;
            }

            // update configuration
            /*this.appConfigProvider.enableLocalDataService(false);
            if (!config.datasetsEnabled.includes(graph)) {
                config.datasetsEnabled.push(graph);
            }*/
            localStorage.setItem("catalog", JSON.stringify(config.catalog));

            this.setState({ isPublished: true });

            alert(
                "Publication was successful.\n\n" +
                    "A private catalogue has been created that includes the published dataset. " +
                    "Please download this catalogue by clicking the button that will show up next to 'Publish'. " +
                    "The catalogue will allow you to reuse the catalogue at a later time and share it with others! " +
                    "(One can simply drop a catalogue file on a blank part of the Evoke website to active it.) \n\n" +
                    "For your convenience, the newly created private catalogue has been activated in your own browser. " +
                    "You can now select your published dataset for viewing alongside other datasets. " +
                    "When doing so, we recommend hiding your local data (with a button on this page) to avoid seeing duplicate information that is available locally and online."
            );
        }
    }

    async publishRDF(
        file: any,
        mimeType: string,
        store: string,
        graph: string,
        username?: string,
        password?: string
    ): Promise<boolean> {
        let result = null;
        try {
            const response = await fetch(
                store + (graph ? "?context=" + encodeURIComponent("<" + graph + ">") : ""),
                {
                    method: "PUT",
                    headers:
                        username && password
                            ? {
                                  "Content-Type": mimeType + "; charset=utf-8",
                                  Authorization: "Basic " + btoa(username + ":" + password)
                              }
                            : { "Content-Type": mimeType + "; charset=utf-8" },
                    body: file
                }
            );
            result = response.json();
        } catch (error) {
            return false;
        }
        return true;
    }

    setStateLocalDataService(enable: boolean) {
        this.appConfigProvider.enableLocalDataService(enable);
        this.setState({ localDataServiceEnabled: enable });
    }
}
