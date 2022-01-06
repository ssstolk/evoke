// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { DataLoader } from "app/services/data-loader/data-loader.service";
import { IAppConfigProvider } from "app/services/config/app-config-loader.service";
import { Input, Form, Button, InputGroup, InputGroupAddon } from "reactstrap";
import { ILDResourceItemProps } from "app/ui/elements/ld-resource-item";
import { LDResourceListing } from "app/ui/elements/ld-resource-listing";
import {
    LOCAL_STORAGE,
    LOCAL_STORAGE_DATASERVICE
} from "app/services/infrastructure/sparql-executor";
import { resolveInject } from "app/di";
import { SparqlRecord, EVOKE_VAR_SOURCE } from "app/services/infrastructure/sparql-result-parser";
import { withLoading } from "app/ui/_generic/loader";

import "./annotations.less";

export function getAnnotations(iri: string) {
    return withLoading(Annotations, "spinner", DataLoader.loadResourceAnnotations, [iri]);
}

export interface IAnnotationsProps {
    iri: string;
    data?: any;
}

interface IAnnotationsState {
    value?: string;
    data?: any;
}

export class Annotations extends React.Component<IAnnotationsProps, IAnnotationsState> {
    private appConfigProvider = resolveInject(IAppConfigProvider);

    constructor(props: IAnnotationsProps) {
        super(props);
        this.state = { data: props.data };
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.getMenuOptions = this.getMenuOptions.bind(this);
        this.deleteItem = this.deleteItem.bind(this);
    }

    render(): JSX.Element | null {
        const localDataServiceEnabled = this.appConfigProvider.config.localDataServiceEnabled;
        const data = this.state.data;

        return (
            <div className="ld-annotation-listing">
                <LDResourceListing
                    data={data}
                    group={{ literal: "Annotation" }}
                    menu={this.getMenuOptions}
                />
                {localDataServiceEnabled && (
                    <div>
                        <Form onSubmit={this.handleSubmit}>
                            <InputGroup>
                                <Input
                                    className="add-annotation"
                                    placeholder="Add your own #annotation..."
                                    value={this.state.value || ""}
                                    onChange={this.handleChange}
                                />
                                <InputGroupAddon addonType="append">
                                    <Button
                                        type="submit"
                                        color="primary"
                                        active={this.state.value ? true : false}
                                        disabled={this.state.value ? false : true}
                                    >
                                        Add
                                    </Button>
                                </InputGroupAddon>
                            </InputGroup>
                        </Form>
                    </div>
                )}
            </div>
        );
    }

    getMenuOptions(data: SparqlRecord, group?: ILDResourceItemProps) {
        const source = data[EVOKE_VAR_SOURCE];
        if (
            source &&
            source.value &&
            source.value.endpointURL &&
            source.value.endpointURL == LOCAL_STORAGE
        ) {
            return [{ name: "delete", key: "delete", function: this.deleteItem }];
        }
        return [];
    }

    deleteItem(data: SparqlRecord, group?: ILDResourceItemProps) {
        const entry = data["entry"];
        if (entry) {
            const iri = entry.value;
            DataLoader.removeAnnotation(iri);
            const data = this.state.data.filter((element: any) => {
                return !element.entry || element.entry.value != iri || element.entry.type != "uri";
            });
            this.setState({ data });
        }
    }

    handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const textElement = event.target as HTMLInputElement;
        if (textElement) {
            this.setState({ value: textElement.value });
        }
    }

    async handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const text = this.state.value;
        if (text) {
            console.log("request to add annotation: " + text);
            const iri = await DataLoader.addAnnotation(this.props.iri, text);
            const annotation: any = { entry: { value: iri, type: "uri" } };
            annotation[EVOKE_VAR_SOURCE] = { type: "literal", value: LOCAL_STORAGE_DATASERVICE };
            this.setState({ value: undefined, data: this.state.data.concat([annotation]) });
        }
    }
}
