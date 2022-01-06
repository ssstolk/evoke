// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import {
    Button,
    Input,
    InputGroup,
    InputGroupAddon,
    InputGroupText,
    DropdownToggle,
    DropdownItem,
    DropdownMenu,
    UncontrolledDropdown
} from "reactstrap";
import { DataLoader } from "app/services/data-loader/data-loader.service";
import { DataRequest, withLoadingMultiple } from "app/ui/_generic/loader";
import { IAppConfigProvider } from "app/services/config/app-config-loader.service";
import { resolveInject } from "app/di";

export function getFeatureSelector(type: string, initialData: any = {}) {
    const requests = FeaturesSelector.getFeaturesRequests(type, initialData);
    return withLoadingMultiple(FeaturesSelector, "spinner", requests, initialData);
}

export interface IFeatureSelectorProps {
    type: string;
    features?: any;
    data?: any;
    onChange: (features: any) => void;
}

export class FeaturesSelector extends React.Component<IFeatureSelectorProps> {
    public static getFeaturesRequests(type: string, initialData: any = {}) {
        const config = resolveInject(IAppConfigProvider).config;
        const sources = config.datasetsEnabled;
        const sourcesDirty =
            !initialData.sources || JSON.stringify(sources) != JSON.stringify(initialData.sources);

        if (initialData.type == type && !sourcesDirty) {
            return [];
        }

        initialData.type = type;
        initialData.sources = [...sources];

        delete initialData.labels;
        delete initialData.languages;
        delete initialData.pos;

        const requests: DataRequest[] = [];
        requests.push({
            key: "labels",
            promiseFunc: DataLoader.loadAvailableLabels,
            promiseArgs: [type, true]
        });
        requests.push({
            key: "languages",
            promiseFunc: DataLoader.loadAvailableLanguages,
            promiseArgs: [type, true]
        });
        requests.push({
            key: "pos",
            promiseFunc: DataLoader.loadAvailablePos,
            promiseArgs: [true]
        });
        return requests;
    }

    render(): JSX.Element {
        const { type, features } = this.props;
        const labelOptions = this.props.data.labels;
        const languageOptions = this.props.data.languages;

        const canAddFeature: string[] = [];
        if (
            Array.isArray(labelOptions) &&
            this.getSelectableOptions(features, "label", labelOptions).length > 0
        ) {
            canAddFeature.push("label");
        }
        if (!Features.mentions(features, "pos")) {
            canAddFeature.push("pos");
        }
        if (
            !Features.mentions(features, "language") &&
            languageOptions &&
            languageOptions.length > 1
        ) {
            canAddFeature.push("language");
        }

        return (
            <>
                {this.renderFeatures(features)}
                {canAddFeature.length > 0 && (
                    <UncontrolledDropdown style={{ marginTop: "2.5em" }}>
                        <DropdownToggle outline>
                            <i className="oi oi-plus" /> Add feature
                        </DropdownToggle>
                        <DropdownMenu>
                            {canAddFeature.includes("label") && (
                                <DropdownItem
                                    onClick={event => {
                                        const newFeatures = Array.isArray(features) ? features : [];
                                        newFeatures.push({ label: null });
                                        this.props.onChange(newFeatures);
                                    }}
                                >
                                    Label
                                </DropdownItem>
                            )}
                            {canAddFeature.includes("pos") && (
                                <DropdownItem
                                    onClick={event => {
                                        const newFeatures = Array.isArray(features) ? features : [];
                                        newFeatures.push({ pos: null });
                                        this.props.onChange(newFeatures);
                                    }}
                                >
                                    Part of speech
                                </DropdownItem>
                            )}
                            {canAddFeature.includes("language") && (
                                <DropdownItem
                                    onClick={event => {
                                        const newFeatures = Array.isArray(features) ? features : [];
                                        newFeatures.push({ language: null });
                                        this.props.onChange(newFeatures);
                                    }}
                                >
                                    Language
                                </DropdownItem>
                            )}
                        </DropdownMenu>
                    </UncontrolledDropdown>
                )}
                <br />
                <br />
            </>
        );
    }

    getSelectableOptions(
        features: any,
        featureKey: string,
        options: any[],
        selectedOption?: string
    ) {
        const result = [];
        if (!options) {
            if (selectedOption) {
                result.push(selectedOption);
            }
        } else {
            for (const option of options) {
                if (
                    option.entry == selectedOption ||
                    !Features.contains(features, featureKey, option.entry)
                ) {
                    result.push(option);
                }
            }
        }
        return result;
    }

    renderFeatures(features: any, index?: number, array?: any[], allFeatures?: any): JSX.Element {
        if (features) {
            if (Array.isArray(features)) {
                const logic = features[0] == "or" ? "or" : features[0] == "not" ? "not" : "and";
                return (
                    <div className={"logic-group-" + logic}>
                        {features.map((feature, index, array) => {
                            return feature == logic ? (
                                <></>
                            ) : (
                                this.renderFeatures(feature, index, array, allFeatures || features)
                            );
                        })}
                    </div>
                );
            }
            if (index !== undefined && array && allFeatures) {
                return this.renderFeature(features, index, array, allFeatures);
            }
        }
        return <></>;
    }

    renderFeature(feature: any, index: number, array: any[], allFeatures: any): JSX.Element {
        if ("label" in feature) {
            const options = this.getSelectableOptions(
                allFeatures,
                "label",
                this.props.data.labels,
                feature.label
            );
            return this.renderFeatureAsSelect(
                feature,
                index,
                array,
                allFeatures,
                "label",
                "Label",
                options
            );
        }
        if ("language" in feature) {
            const options = this.getSelectableOptions(
                allFeatures,
                "language",
                this.props.data.languages,
                feature.language
            );
            return this.renderFeatureAsSelect(
                feature,
                index,
                array,
                allFeatures,
                "language",
                "Language",
                options
            );
        }
        if ("pos" in feature) {
            const options = this.getSelectableOptions(
                allFeatures,
                "pos",
                this.props.data.pos,
                feature.pos
            );
            return this.renderFeatureAsSelect(
                feature,
                index,
                array,
                allFeatures,
                "pos",
                "Part of speech",
                options
            );
        }
        return <></>;
    }

    renderFeatureAsSelect(
        feature: any,
        index: number,
        array: any[],
        allFeatures: any,
        featureKey: string,
        featureName: string,
        options: any[]
    ): JSX.Element {
        return (
            <InputGroup
                key={"feature-" + index + "-inputgroup"}
                style={{ marginTop: "0.5em", marginBottom: "0.5em" }}
            >
                <InputGroupAddon addonType="prepend">
                    <InputGroupText>{featureName}</InputGroupText>
                </InputGroupAddon>
                <Input
                    type="select"
                    name="select"
                    onChange={event => {
                        feature[featureKey] = event.target.value;
                        this.props.onChange(allFeatures);
                    }}
                    value={feature[featureKey] || undefined}
                >
                    <option key={"feature-" + index + "-option-null"}>(please choose..)</option>
                    {options.map((option: any) => {
                        return (
                            <option
                                key={"feature-" + index + "-option-" + option.entry}
                                value={option.entry}
                                title={"value: " + option.entry}
                            >
                                {option.name ? option.name : option.entry}
                            </option>
                        );
                    })}
                </Input>
                <Button
                    close
                    style={{ marginLeft: "0.2em" }}
                    onClick={() => {
                        array.splice(index, 1);
                        this.props.onChange(allFeatures);
                    }}
                />
            </InputGroup>
        );
    }
}

export class Features {
    public static mentions(features: any, key: string): boolean {
        return Features.contains(features, key, null);
    }

    // value:
    // * when null, this function will indicate whether
    //   the key is mentioned regardless of whether it contains a value;
    // * when undefined, this function will indicate whether
    //   the key is mentioned with a value in the features;
    // * when defined, this function will indicate whether
    //   the key is mentioned with the value specified
    public static contains(features: any, key: string, value?: string | null): boolean {
        if (Array.isArray(features)) {
            for (const entry of features) {
                if (entry.hasOwnProperty(key)) {
                    if (value === null) {
                        return true;
                    } else {
                        if ((value === undefined && entry[key]) || (value && entry[key] == value)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
}
