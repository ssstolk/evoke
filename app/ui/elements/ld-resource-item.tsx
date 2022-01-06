// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright © 2018-2022 Sander Stolk

import * as React from "react";
import { Badge } from "reactstrap";
import { DataLoader } from "app/services/data-loader/data-loader.service";
import { getLDResourceLabellist } from "./ld-resource-labellist";
import { LanguageHelper } from "app/utils/language-helper";
import { NavigateService } from "app/services/navigate.service";
import { RDF, SKOS, ONTOLEX } from "app/data/rdf/namespaces";
import { SparqlValue } from "app/services/infrastructure/sparql-executor";
import { TextItem } from "./text-item";
import { withLoadingMultiple } from "app/ui/_generic/loader";

const cachedItems: any = {};

export function getLDResourceItem(props: ILDResourceItemProps) {
    const iri =
        props.iri || (props.resource && props.resource.type == "uri" && props.resource.value);
    if (iri && cachedItems[iri]) {
        return cachedItems[iri];
    }
    const data = LDResourceItem.initData(props);
    const item = withLoadingMultiple(
        LDResourceItem,
        "ellipsis",
        [
            { key: "type", promiseFunc: LDResourceItem.loadResourceType, promiseArgs: [data] },
            { key: "name", promiseFunc: LDResourceItem.loadResourceName, promiseArgs: [data] },
            { key: "name", promiseFunc: LDResourceItem.formResourceName, promiseArgs: [data] },
            { key: "pos", promiseFunc: LDResourceItem.loadResourcePos, promiseArgs: [data] },
            {
                key: "annotationLabels",
                promiseFunc: LDResourceItem.loadAnnotationLabels,
                promiseArgs: [data]
            }
        ],
        data
    );

    if (iri) {
        cachedItems[iri] = item;
    }
    return item;
}

export type EvokeResourceType = "concept" | "sense" | "entry" | "pos" | "label" | "annotation";

export interface ILDResourceItemProps {
    literal?: string; // NOTE: language tag can be captured using 'resource' attribute instead
    iri?: string;
    resource?: SparqlValue;
    resourceType?: EvokeResourceType;
    showLabels?: boolean;
    outline?: boolean;
    style?: any;
}

export interface ILDResourceItemState {
    data: any;
}

export class LDResourceItem extends React.Component<ILDResourceItemProps, ILDResourceItemState> {
    constructor(props: any) {
        super(props);
        this.state = { data: props.data };
    }

    static initData(props: ILDResourceItemProps) {
        const type = props.resourceType;
        const resource = props.resource;
        const literal = resource && resource.type == "literal" ? resource.value : props.literal;
        const iri = resource && resource.type == "uri" ? resource.value : props.iri;

        const data = { type, literal, iri, resource };

        // preload data for known/recognised IRIs
        if (iri) {
            this.fetchKnownData(iri, data) || this.fetchCachedData(iri, data);
        }

        return data;
    }

    static createLiteralNode(value: string, language?: string): SparqlValue {
        return { type: "literal", value, "xml:lang": language };
    }

    static fetchKnownData(iri: string, data: any): boolean {
        switch (iri) {
            case RDF + "type":
                data.type = null;
                data.name = LDResourceItem.createLiteralNode("Type", "en");
                return true;
            case SKOS + "Concept":
                data.type = null;
                data.name = LDResourceItem.createLiteralNode("Concept", "en");
                return true;
            case SKOS + "prefLabel":
                data.type = null;
                data.name = LDResourceItem.createLiteralNode("Name", "en");
                return true;
            case SKOS + "notation":
                data.type = null;
                data.name = LDResourceItem.createLiteralNode("Code", "en");
                return true;
            case SKOS + "inScheme":
                data.type = null;
                data.name = LDResourceItem.createLiteralNode("Belongs to", "en");
                return true;
            case SKOS + "related":
                data.type = null;
                data.name = LDResourceItem.createLiteralNode("Related", "en");
                return true;
            case SKOS + "topConceptOf":
                data.type = null;
                data.name = LDResourceItem.createLiteralNode("Is top concept of", "en");
                return true;
            case ONTOLEX + "LexicalConcept":
                data.type = null;
                data.name = LDResourceItem.createLiteralNode("Lexical concept", "en");
                return true;
            case ONTOLEX + "LexicalEntry":
                data.type = null;
                data.name = LDResourceItem.createLiteralNode("Lexical entry", "en");
                return true;
            case ONTOLEX + "LexicalSense":
                data.type = null;
                data.name = LDResourceItem.createLiteralNode("Lexical sense", "en");
                return true;
        }
        return false;
    }

    static fetchCachedData(iri: string, data: any): boolean {
        return false;
    }

    static loadResourceType(data: any): Promise<any> | null {
        if (data.type === undefined && data.iri) {
            return DataLoader.loadResourceType(data.iri);
        }
        return null;
    }

    static loadResourceName(data: any): Promise<any> | null {
        if (data.name === undefined && data.iri) {
            switch (data.type) {
                case "concept":
                    return DataLoader.loadConceptName(data.iri);
                case "sense":
                    return DataLoader.loadSenseName(data.iri);
                case "entry":
                    return DataLoader.loadEntryName(data.iri);
                case "pos":
                    return DataLoader.loadPosName(data.iri);
                case "label":
                    return DataLoader.loadLabelName(data.iri);
                case "annotation":
                    return DataLoader.loadAnnotationName(data.iri);
                default:
                    return DataLoader.loadResourceName(data.iri);
            }
        }
        return null;
    }

    static formResourceName(data: any): Promise<any> | null {
        if (!data.name && data.iri) {
            data.name = LDResourceItem.createLiteralNode(
                LDResourceItem.obtainNameFromIRI(data.iri)
            );
        }
        return null;
    }

    static loadResourcePos(data: any): Promise<any> | null {
        if (data.pos === undefined && data.iri) {
            switch (data.type) {
                case "sense":
                    return DataLoader.loadSensePos(data.iri);
                case "entry":
                    return DataLoader.loadEntryPos(data.iri);
            }
        }
        return null;
    }

    static loadAnnotationLabels(data: any): Promise<any> | null {
        if (data.type == "annotation" && data.annotationLabels === undefined && data.iri) {
            return DataLoader.loadAnnotationLabels(data.iri);
        }
        return null;
    }

    static obtainNameFromIRI(iri: string): string {
        const localname = LDResourceItem.obtainLocalNameFromIRI(iri);
        if (localname && localname.length > 0) {
            return LDResourceItem.decamelize(localname);
        }
        return iri;
    }

    static obtainLocalNameFromIRI(iri: string): string | null {
        if (iri.endsWith("#") || iri.endsWith("/")) {
            return null;
        }

        const hashPos = iri.lastIndexOf("#");
        if (hashPos >= 0) {
            return iri.substr(hashPos + 1);
        }
        const slashPos = iri.lastIndexOf("/");
        if (slashPos >= 0) {
            return iri.substr(slashPos + 1);
        }
        return null;
    }

    static decamelize(str: string, separator?: string): string {
        if (!str || str.length < 1) {
            return "";
        }
        if (!separator) {
            separator = " ";
        }
        return str
            .substr(0, 1)
            .toLocaleUpperCase()
            .concat(
                str
                    .substr(1)
                    .replace(/([a-z\d])([A-Z])/g, "$1" + separator + "$2")
                    .replace(/([A-Z]+)([A-Z][a-z\d]+)/g, "$1" + separator + "$2")
                    .toLocaleLowerCase()
            );
    }

    getResourceLanguageTag(): string | undefined {
        const { resource } = this.state.data;
        return resource ? resource["xml:lang"] : undefined;
    }

    getResourceLanguageName(): string | null {
        const langTag = this.getResourceLanguageTag();
        const langName = LanguageHelper.getLanguageName(langTag);
        return langName || null;
    }

    render(): JSX.Element | null {
        if (!this.state.data) {
            console.log("data should have been set, but was not");
            return null;
        }

        const { literal, iri, type, name } = this.state.data;
        const text = name ? name.value : literal;

        if (literal && !type) {
            const showLabels = this.props.showLabels || false;
            const languageName = this.getResourceLanguageName();
            if (!showLabels || !languageName) {
                return <TextItem text={text} />;
            }

            const LangItem = getLDResourceItem({ resourceType: "label", literal: languageName });
            return (
                <>
                    <span className="mr-auto">
                        <TextItem text={text} />
                    </span>
                    {showLabels && (
                        <>
                            <LangItem
                                style={{
                                    marginLeft: "0.3em",
                                    borderColor: "#73c9ec",
                                    backgroundColor: "#73c9ec",
                                    fontStyle: "oblique"
                                }}
                            />
                        </>
                    )}
                </>
            );
        }

        if (!literal && !iri) {
            return <TextItem text={"[blank node]"} />;
        }

        const link = iri ? NavigateService.getBrowseLink(iri) : undefined;

        switch (type) {
            case "concept":
                return this.renderConcept(text, link);
            case "sense":
            case "entry":
                return this.renderLexicalItem(text, link);
            case "pos":
            case "label":
                return this.renderBadge(text, link);
            case "annotation":
                return this.renderAnnotation(text, link);
        }
        return <TextItem text={text} link={link} />;
    }

    renderConcept(text: string, link?: string) {
        return <TextItem text={text} link={link} icon="icon-term-type" />;
    }

    renderLexicalItem(text: string, link?: string) {
        const { iri, type, name, pos } = this.state.data;
        const showLabels = this.props.showLabels || false;

        const PosItem = getLDResourceItem({ iri: pos, resourceType: "pos" });
        const LangItem = getLDResourceItem({
            resourceType: "label",
            literal: LanguageHelper.getLanguageName(name["xml:lang"])
        });
        const LabelList = getLDResourceLabellist({ iri: iri, resourceType: type });
        return (
            <>
                <span className="mr-auto">
                    <PosItem /> <TextItem text={text} link={link} />
                </span>
                {showLabels && (
                    <>
                        <LabelList />
                        <LangItem
                            style={{
                                marginLeft: "0.3em",
                                borderColor: "#73c9ec",
                                backgroundColor: "#73c9ec",
                                fontStyle: "oblique"
                            }}
                        />
                    </>
                )}
            </>
        );
    }

    renderBadge(text: string, link?: string) {
        const { outline, style } = this.props;

        return (
            <Badge
                className={outline ? "badge-outline-secondary" : "badge-secondary"}
                style={style}
            >
                <TextItem text={text} link={link} />
            </Badge>
        );
    }

    renderAnnotation(text: string, link?: string) {
        const { annotationLabels } = this.state.data;

        const labelList =
            annotationLabels &&
            annotationLabels.map((label: string) => {
                const LabelItem = getLDResourceItem({ iri: label, resourceType: "label" });
                return <LabelItem key={label} />;
            });
        return (
            <span>
                <TextItem text={text ? text : "..."} link={link} />
                {labelList && (
                    <>
                        <br />
                        <div>{labelList}</div>
                    </>
                )}
            </span>
        );
    }
}
